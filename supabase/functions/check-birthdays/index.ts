import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from '@supabase/supabase-js';

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-BIRTHDAYS] ${step}${detailsStr}`);
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const now = new Date();
    const month = now.getUTCMonth() + 1;
    const day = now.getUTCDate();

    logStep('Checking birthdays', { month, day });

    // Query all three entity tables for today's birthdays
    const tables = [
      { table: 'contacts', type: 'contact' },
      { table: 'leads', type: 'lead' },
      { table: 'companies', type: 'company' },
    ] as const;

    let totalNotifications = 0;

    for (const { table, type } of tables) {
      const { data: entities, error } = await supabase
        .from(table)
        .select('id, name, workspace_id, birth_date')
        .not('birth_date', 'is', null)
        .is('deleted_at', null);

      if (error) {
        logStep(`Error querying ${table}`, { error: error.message });
        continue;
      }

      if (!entities || entities.length === 0) continue;

      // Filter by month/day in JS (birth_date is a date column)
      const matches = entities.filter((e) => {
        if (!e.birth_date) return false;
        const bd = new Date(e.birth_date);
        return bd.getUTCMonth() + 1 === month && bd.getUTCDate() === day;
      });

      if (matches.length === 0) continue;

      logStep(`Found ${matches.length} birthdays in ${table}`);

      // Build notifications, avoiding duplicates for today
      const notifications = matches.map((e) => ({
        workspace_id: e.workspace_id,
        type: 'birthday',
        title: `🎂 Aniversário: ${e.name}`,
        message: `Hoje é o aniversário de ${e.name}. Aproveite para enviar uma mensagem de felicitação!`,
        metadata: { entity_type: type, entity_id: e.id },
        is_read: false,
      }));

      // Check for existing birthday notifications today to avoid duplicates
      const todayStart = new Date(now);
      todayStart.setUTCHours(0, 0, 0, 0);

      const { data: existing } = await supabase
        .from('admin_notifications')
        .select('metadata')
        .eq('type', 'birthday')
        .gte('created_at', todayStart.toISOString());

      const existingIds = new Set(
        (existing || []).map((n: any) => n.metadata?.entity_id)
      );

      const newNotifications = notifications.filter(
        (n) => !existingIds.has(n.metadata.entity_id)
      );

      if (newNotifications.length === 0) continue;

      const { error: insertError } = await supabase
        .from('admin_notifications')
        .insert(newNotifications);

      if (insertError) {
        logStep(`Insert error for ${table}`, { error: insertError.message });
        continue;
      }

      totalNotifications += newNotifications.length;
    }

    logStep('Done', { totalNotifications });

    return new Response(
      JSON.stringify({ success: true, notifications: totalNotifications }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    logStep('ERROR', { message: (error as Error).message });
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
