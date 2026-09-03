// whatsapp-zapi-sync-groups
// Sincroniza grupos WhatsApp (Z-API) para whatsapp_zapi_groups +
// whatsapp_zapi_group_participants, isolados por workspace e instância.
//
// Fonte primária: GET /groups?page=&pageSize=
// Fallback (registado): GET /chats?type=group
// Detalhe/participantes: GET /light-group-metadata/{groupId}

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0';
import { corsHeaders } from '../_shared/cors.ts';
import { zapiCall, safeJson, type ZapiCredentials } from '../_shared/zapi.ts';
import {
  parseGroupsListResponse,
  mapZapiGroup,
  mapZapiParticipant,
  diffMissingParticipants,
  type NormalizedParticipant,
} from '../_shared/whatsappGroups.ts';

const PAGE_SIZE = 50;
const MAX_PAGES = 40;

function jsonRes(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return jsonRes({ error: 'Unauthorized' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(
      authHeader.replace('Bearer ', ''),
    );
    if (claimsErr || !claims?.claims?.sub) return jsonRes({ error: 'Unauthorized' }, 401);
    const userId = claims.claims.sub as string;

    const { workspaceId } = await req.json();
    if (!workspaceId) return jsonRes({ error: 'workspaceId required' }, 400);

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { data: membership } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .maybeSingle();

    let isSuperAdmin = false;
    if (!membership) {
      const { data: superAdminCheck } = await admin.rpc('is_super_admin', { _user_id: userId });
      isSuperAdmin = superAdminCheck === true;
    }
    if (!membership && !isSuperAdmin) return jsonRes({ error: 'Not a member of this workspace' }, 403);

    const { data: conn } = await admin
      .from('whatsapp_zapi_connections')
      .select('instance_id, instance_token, client_token, status')
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (!conn || conn.status !== 'connected') {
      return jsonRes({ error: 'WhatsApp Z-API não está conectado' }, 400);
    }

    // Instância de provider (isolamento por instância)
    const { data: providerInstanceId, error: instErr } = await admin.rpc(
      'ensure_whatsapp_provider_instance',
      { p_workspace_id: workspaceId },
    );
    if (instErr) {
      console.error('[zapi-sync-groups] provider instance error', instErr.message);
      return jsonRes({ error: instErr.message, fallback: true }, 200);
    }

    const creds: ZapiCredentials = {
      instanceId: conn.instance_id,
      instanceToken: conn.instance_token,
      clientToken: conn.client_token,
    };

    // ---- 1) Listagem paginada -------------------------------------------
    const rawGroups: Record<string, unknown>[] = [];
    let source: 'groups' | 'chats' = 'groups';
    let page = 1;

    while (page <= MAX_PAGES) {
      const res = await zapiCall(creds, `/groups?page=${page}&pageSize=${PAGE_SIZE}`, { method: 'GET' });
      const data = await safeJson(res);
      if (!res.ok) {
        console.warn(`[zapi-sync-groups] /groups falhou status=${res.status} page=${page}`);
        if (page === 1) { rawGroups.length = 0; source = 'chats'; }
        break;
      }
      const batch = parseGroupsListResponse(data);
      rawGroups.push(...batch);
      if (batch.length < PAGE_SIZE) break;
      page++;
    }

    if (source === 'chats') {
      console.log('[zapi-sync-groups] FALLBACK /chats?type=group');
      let cpage = 1;
      while (cpage <= MAX_PAGES) {
        const res = await zapiCall(creds, `/chats?type=group&page=${cpage}&pageSize=${PAGE_SIZE}`, { method: 'GET' });
        const data = await safeJson(res);
        if (!res.ok) {
          console.error('[zapi-sync-groups] fallback error', res.status, data);
          if (cpage === 1) return jsonRes({ error: 'Falha ao listar grupos', details: data }, 200);
          break;
        }
        const batch = parseGroupsListResponse(data);
        rawGroups.push(...batch);
        if (batch.length < PAGE_SIZE) break;
        cpage++;
      }
    }

    const now = new Date().toISOString();
    let upserted = 0;
    let skipped = 0;
    let participantsUpserted = 0;
    const errors: { groupId: string; error: string }[] = [];

    for (const raw of rawGroups) {
      const g = mapZapiGroup(raw);
      if (!g) { skipped++; continue; }

      // ---- 2) Metadata light (detalhe + participantes) ------------------
      let participants: NormalizedParticipant[] = [];
      let metaError: string | null = null;
      let meta: Record<string, unknown> | null = null;
      try {
        const mres = await zapiCall(creds, `/light-group-metadata/${encodeURIComponent(g.groupId)}`, { method: 'GET' });
        const mdata = await safeJson(mres);
        if (mres.ok && mdata) {
          meta = mdata as Record<string, unknown>;
          const list = Array.isArray(meta.participants) ? meta.participants : [];
          participants = list
            .map((p: unknown) => mapZapiParticipant(p))
            .filter((p): p is NormalizedParticipant => !!p);
        } else {
          metaError = `light-group-metadata status ${mres.status}`;
        }
      } catch (e) {
        metaError = String(e);
      }

      const merged = meta ? mapZapiGroup({ ...raw, ...meta }) ?? g : g;

      const { data: groupRow, error: upErr } = await admin
        .from('whatsapp_zapi_groups')
        .upsert(
          {
            workspace_id: workspaceId,
            provider_instance_id: providerInstanceId as string,
            group_id: merged.groupId,
            name: merged.name ?? merged.groupId,
            description: merged.description,
            picture_url: merged.pictureUrl,
            participants_count: participants.length || merged.participantsCount,
            is_admin: merged.isAdmin,
            is_owner: merged.isOwner,
            is_announcement: merged.isAnnouncement,
            is_community: merged.isCommunity,
            is_archived: merged.isArchived,
            is_muted: merged.isMuted,
            is_pinned: merged.isPinned,
            unread_count: merged.unreadCount,
            last_message_at: merged.lastMessageAt,
            admin_only_message: merged.adminOnlyMessage,
            admin_only_settings: merged.adminOnlySettings,
            admin_only_add_member: merged.adminOnlyAddMember,
            require_admin_approval: merged.requireAdminApproval,
            status: metaError ? 'SYNC_ERROR' : 'ACTIVE',
            sync_error: metaError,
            metadata_json: meta ?? raw,
            last_synced_at: now,
            updated_at: now,
          },
          { onConflict: 'workspace_id,provider_instance_id,group_id' },
        )
        .select('id')
        .maybeSingle();

      if (upErr || !groupRow) {
        errors.push({ groupId: merged.groupId, error: upErr?.message ?? 'upsert_failed' });
        continue;
      }
      upserted++;

      // ---- 3) Participantes + reconciliação ------------------------------
      if (participants.length > 0) {
        const rows = participants.map((p) => ({
          workspace_id: workspaceId,
          provider_instance_id: providerInstanceId as string,
          whatsapp_group_id: groupRow.id,
          group_id: merged.groupId,
          participant_id_raw: p.participantIdRaw,
          normalized_phone: p.normalizedPhone,
          lid: p.lid,
          display_name: p.displayName,
          is_admin: p.isAdmin,
          is_owner: p.isOwner,
          membership_status: p.membershipStatus,
          last_synced_at: now,
          updated_at: now,
        }));

        const { error: pErr } = await admin
          .from('whatsapp_zapi_group_participants')
          .upsert(rows, { onConflict: 'whatsapp_group_id,participant_id_raw' });

        if (pErr) {
          errors.push({ groupId: merged.groupId, error: `participants: ${pErr.message}` });
        } else {
          participantsUpserted += rows.length;

          const { data: knownRows } = await admin
            .from('whatsapp_zapi_group_participants')
            .select('participant_id_raw')
            .eq('whatsapp_group_id', groupRow.id)
            .not('membership_status', 'in', '("REMOVED","LEFT","REJECTED")');

          const missing = diffMissingParticipants(
            (knownRows ?? []).map((r: { participant_id_raw: string }) => r.participant_id_raw),
            participants.map((p) => p.participantIdRaw),
          );

          if (missing.length > 0) {
            await admin
              .from('whatsapp_zapi_group_participants')
              .update({ membership_status: 'REMOVED', removed_at: now, updated_at: now })
              .eq('whatsapp_group_id', groupRow.id)
              .in('participant_id_raw', missing);
          }
        }
      }
    }

    await admin.from('whatsapp_group_audit_log').insert({
      workspace_id: workspaceId,
      action: 'SYNC_GROUPS',
      actor_user_id: userId,
      after_state: {
        source,
        total: rawGroups.length,
        synced: upserted,
        skipped,
        participants: participantsUpserted,
        errors: errors.length,
      },
    });

    console.log(
      `[zapi-sync-groups] ws=${workspaceId} source=${source} synced=${upserted}/${rawGroups.length} participants=${participantsUpserted} errors=${errors.length}`,
    );

    return jsonRes({
      success: true,
      source,
      synced: upserted,
      total: rawGroups.length,
      skipped,
      participants: participantsUpserted,
      errors,
    });
  } catch (err) {
    console.error('[zapi-sync-groups] internal error', err);
    return jsonRes({ error: 'internal_error', details: String(err) }, 200);
  }
});
