// Partner B2B abandoned cart recovery — runs every 30 min via pg_cron.
// Sequence: first (4h) → second (24h) → third (72h) → expired (14d).
// Resilient: catches errors per cart, returns 200 OK with summary.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RecoveryConfig {
  workspace_id: string;
  enabled: boolean;
  first_delay_minutes: number;
  second_delay_minutes: number;
  third_delay_minutes: number;
  expire_after_days: number;
}

interface CartRow {
  id: string;
  workspace_id: string;
  partner_account_id: string;
  partner_user_id: string;
  items: Array<{ product_id: string; product_name?: string; quantity: number; unit_price_net: number }>;
  applied_coupon_code: string | null;
  subtotal_net: number;
  recovery_stage: 'none' | 'first' | 'second' | 'third' | 'recovered' | 'expired';
  recovery_token: string;
  last_activity_at: string;
}

const STAGE_ORDER: Array<'first' | 'second' | 'third'> = ['first', 'second', 'third'];

const DEFAULT_CONFIG: Omit<RecoveryConfig, 'workspace_id' | 'enabled'> = {
  first_delay_minutes: 240,
  second_delay_minutes: 1440,
  third_delay_minutes: 4320,
  expire_after_days: 14,
};

function nextStageFor(cart: CartRow, cfg: Omit<RecoveryConfig, 'workspace_id' | 'enabled'>, now: Date): 'first' | 'second' | 'third' | null {
  const ageMin = (now.getTime() - new Date(cart.last_activity_at).getTime()) / 60000;
  const currentIdx = STAGE_ORDER.indexOf(cart.recovery_stage as any);
  // We want to advance to the next stage whose threshold has been reached
  if (cart.recovery_stage === 'none' && ageMin >= cfg.first_delay_minutes) return 'first';
  if (cart.recovery_stage === 'first' && ageMin >= cfg.second_delay_minutes) return 'second';
  if (cart.recovery_stage === 'second' && ageMin >= cfg.third_delay_minutes) return 'third';
  return null;
}

async function processWorkspace(
  supabase: any,
  workspaceId: string,
  cfg: Omit<RecoveryConfig, 'workspace_id' | 'enabled'>,
  results: { sent: number; expired: number; errors: number },
) {
  const now = new Date();
  const expireBefore = new Date(now.getTime() - cfg.expire_after_days * 86400000).toISOString();

  // Expire old carts
  const { data: expiredCarts } = await supabase
    .from('partner_carts')
    .update({ recovery_stage: 'expired', abandoned_at: now.toISOString() })
    .lt('last_activity_at', expireBefore)
    .neq('recovery_stage', 'recovered')
    .neq('recovery_stage', 'expired')
    .eq('workspace_id', workspaceId)
    .select('id');
  results.expired += expiredCarts?.length || 0;

  // Fetch candidates
  const { data: carts, error } = await supabase
    .from('partner_carts')
    .select('id, workspace_id, partner_account_id, partner_user_id, items, applied_coupon_code, subtotal_net, recovery_stage, recovery_token, last_activity_at')
    .eq('workspace_id', workspaceId)
    .in('recovery_stage', ['none', 'first', 'second'])
    .gt('subtotal_net', 0)
    .gte('last_activity_at', expireBefore);

  if (error || !carts) return;

  for (const cart of carts as CartRow[]) {
    try {
      if (!cart.items || cart.items.length === 0) continue;
      const next = nextStageFor(cart, cfg, now);
      if (!next) continue;

      // Find recipient email via partner_users (auth_user_id)
      const { data: pu } = await supabase
        .from('partner_users')
        .select('email, full_name')
        .eq('auth_user_id', cart.partner_user_id)
        .maybeSingle();

      const email = pu?.email;
      if (!email) continue;

      // Find workspace public site URL (used in recover link)
      const { data: ws } = await supabase
        .from('workspaces')
        .select('name')
        .eq('id', workspaceId)
        .maybeSingle();
      const storeName = ws?.name || 'Loja';

      const baseUrl = Deno.env.get('PUBLIC_APP_URL') || 'https://fastcrm.lovable.app';
      const recoverUrl = `${baseUrl}/partner/cart?recover=${cart.recovery_token}`;

      const subjects: Record<typeof next, string> = {
        first: 'Tem artigos à sua espera no carrinho',
        second: 'Não se esqueça da sua encomenda',
        third: 'Última oportunidade para finalizar a sua encomenda',
      };

      const itemsHtml = cart.items
        .slice(0, 5)
        .map((i) => `<li>${escapeHtml(i.product_name || 'Produto')} × ${i.quantity}</li>`)
        .join('');
      const moreCount = Math.max(0, cart.items.length - 5);
      const subtotalEur = (cart.subtotal_net || 0).toFixed(2).replace('.', ',');

      const bodyHtml = `
        <p>Olá ${escapeHtml(pu?.full_name || '')},</p>
        <p>O seu carrinho de <strong>${cart.items.length} ${cart.items.length === 1 ? 'artigo' : 'artigos'}</strong> no valor de <strong>€${subtotalEur}</strong> ainda está disponível.</p>
        <ul>${itemsHtml}${moreCount > 0 ? `<li>e mais ${moreCount}…</li>` : ''}</ul>
        <p style="margin:24px 0;"><a href="${recoverUrl}" style="background:#0f172a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">Recuperar carrinho</a></p>
      `;

      const { error: sendError } = await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'cart-recovery',
          recipientEmail: email,
          idempotencyKey: `partner-recovery-${cart.id}-${next}`,
          templateData: {
            bodyHtml,
            storeName,
            previewText: subjects[next],
            subject: subjects[next],
          },
        },
      });

      if (sendError) {
        console.error('[cart-recovery] send failed', cart.id, sendError);
        results.errors++;
        continue;
      }

      // Advance stage
      await supabase.from('partner_carts')
        .update({
          recovery_stage: next,
          abandoned_at: cart.recovery_stage === 'none' ? now.toISOString() : undefined,
        })
        .eq('id', cart.id);

      // Telemetry
      await supabase.from('partner_funnel_events').insert({
        workspace_id: cart.workspace_id,
        partner_account_id: cart.partner_account_id,
        partner_user_id: cart.partner_user_id,
        cart_id: cart.id,
        event_type: 'recovery_email_sent',
        payload: { stage: next, subtotal: cart.subtotal_net } as any,
      });

      results.sent++;
    } catch (e) {
      console.error('[cart-recovery] cart error', cart.id, e);
      results.errors++;
    }
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const results = { sent: 0, expired: 0, errors: 0, workspaces: 0 };

    // Find all workspaces with at least one active cart in candidate window
    const { data: configs } = await supabase
      .from('partner_recovery_config')
      .select('workspace_id, enabled, first_delay_minutes, second_delay_minutes, third_delay_minutes, expire_after_days')
      .eq('enabled', true);

    const configMap = new Map<string, Omit<RecoveryConfig, 'workspace_id' | 'enabled'>>();
    for (const c of (configs || []) as RecoveryConfig[]) {
      configMap.set(c.workspace_id, {
        first_delay_minutes: c.first_delay_minutes,
        second_delay_minutes: c.second_delay_minutes,
        third_delay_minutes: c.third_delay_minutes,
        expire_after_days: c.expire_after_days,
      });
    }

    // Discover workspaces with carts (even without config — uses defaults)
    const { data: wsList } = await supabase
      .from('partner_carts')
      .select('workspace_id')
      .gt('subtotal_net', 0)
      .in('recovery_stage', ['none', 'first', 'second']);

    const uniqueWs = new Set<string>((wsList || []).map((r: any) => r.workspace_id));

    for (const wsId of uniqueWs) {
      const cfg = configMap.get(wsId) || DEFAULT_CONFIG;
      results.workspaces++;
      await processWorkspace(supabase, wsId, cfg, results);
    }

    return new Response(JSON.stringify({ ok: true, ...results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err) {
    console.error('[cart-recovery] fatal', err);
    return new Response(JSON.stringify({ ok: false, fallback: true, error: String(err) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  }
});
