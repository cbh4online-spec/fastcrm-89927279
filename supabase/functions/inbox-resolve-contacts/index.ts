// Edge Function: inbox-resolve-contacts
// Resolves the contact behind unlinked phone-channel conversations and
// caches the result in `conversation_contact_resolutions`.
//
// Strategy:
// 1. Auth the user via JWT and verify workspace membership.
// 2. Find unlinked phone-channel conversations needing (re)resolution
//    (no cache row OR cache older than TTL OR explicit `force`).
// 3. Normalize external_thread_id to E.164 (PT default) with libphonenumber-js.
// 4. Broad DB lookup over leads/contacts/companies via suffix ilike.
// 5. Re-normalize each candidate's phone and group by E.164 per tier.
// 6. Decide tier (contact > lead > company), detect ambiguity.
// 7. Upsert cache; auto-link unambiguous matches into conversations.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { parsePhoneNumberFromString } from "npm:libphonenumber-js@1.11.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const PHONE_CHANNELS = ["whatsapp", "sms", "phone", "ghl"] as const;
const TTL_HOURS = 24;
const MAX_CONVS_PER_RUN = 200;

type Tier = "contact" | "lead" | "company";

interface NormalizedPhone {
  key: string;
  e164: string | null;
  suffix: string;
}

function normalizePhone(raw: string | null | undefined): NormalizedPhone | null {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, "");
  if (digits.length < 7) return null;

  let parsed = parsePhoneNumberFromString(raw, "PT");
  if ((!parsed || !parsed.isValid()) && !raw.startsWith("+") && digits.length >= 11) {
    parsed = parsePhoneNumberFromString(`+${digits}`);
  }

  if (parsed && parsed.isValid()) {
    const e164 = parsed.format("E.164");
    const national = parsed.nationalNumber.toString();
    return { key: e164, e164, suffix: national.slice(-9) };
  }

  const suffix = digits.slice(-9);
  return { key: `~${suffix}`, e164: null, suffix };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // User-scoped client for auth + membership check.
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userRes.user.id;

    let body: { workspace_id?: string; force?: boolean; conversation_ids?: string[] } = {};
    try { body = await req.json(); } catch { /* empty body ok */ }

    const workspaceId = body.workspace_id;
    if (!workspaceId || typeof workspaceId !== "string") {
      return new Response(JSON.stringify({ error: "workspace_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify membership server-side via RPC.
    const { data: isMember } = await userClient.rpc("is_workspace_member", {
      _user_id: userId,
      _workspace_id: workspaceId,
    });
    if (!isMember) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service-role client for the heavy lifting (cache writes, auto-link).
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // 1) Pull unlinked phone-channel conversations.
    let convQuery = admin
      .from("conversations")
      .select("id, external_thread_id, channel, lead_id, contact_id, company_id")
      .eq("workspace_id", workspaceId)
      .in("channel", PHONE_CHANNELS as unknown as string[])
      .is("lead_id", null)
      .is("contact_id", null)
      .is("company_id", null)
      .not("external_thread_id", "is", null)
      .limit(MAX_CONVS_PER_RUN);

    if (Array.isArray(body.conversation_ids) && body.conversation_ids.length > 0) {
      convQuery = convQuery.in("id", body.conversation_ids);
    }

    const { data: convs, error: convErr } = await convQuery;
    if (convErr) throw convErr;
    if (!convs || convs.length === 0) {
      return new Response(JSON.stringify({ ok: true, processed: 0, resolved: 0, ambiguous: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Filter against cache TTL unless force=true.
    let toResolveIds: string[] = convs.map((c) => c.id);
    if (!body.force) {
      const { data: cached } = await admin
        .from("conversation_contact_resolutions")
        .select("conversation_id, resolved_at")
        .in("conversation_id", toResolveIds);
      const ttlMs = TTL_HOURS * 60 * 60 * 1000;
      const fresh = new Set(
        (cached || [])
          .filter((r) => Date.now() - new Date(r.resolved_at).getTime() < ttlMs)
          .map((r) => r.conversation_id),
      );
      toResolveIds = toResolveIds.filter((id) => !fresh.has(id));
    }

    const toResolve = convs.filter((c) => toResolveIds.includes(c.id));
    if (toResolve.length === 0) {
      return new Response(JSON.stringify({ ok: true, processed: 0, resolved: 0, ambiguous: 0, cached: convs.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3) Normalize each.
    type ConvNorm = { convId: string; key: string; suffix: string };
    const convNorms: ConvNorm[] = [];
    const suffixSet = new Set<string>();
    for (const c of toResolve) {
      const n = normalizePhone(c.external_thread_id);
      if (!n) continue;
      convNorms.push({ convId: c.id, key: n.key, suffix: n.suffix });
      suffixSet.add(n.suffix);
    }
    if (suffixSet.size === 0) {
      return new Response(JSON.stringify({ ok: true, processed: toResolve.length, resolved: 0, ambiguous: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4) Broad lookup in leads/contacts/companies.
    const orFilter = Array.from(suffixSet).map((s) => `phone.ilike.%${s}%`).join(",");
    const [leadsRes, contactsRes, companiesRes] = await Promise.all([
      admin.from("leads").select("id, name, phone").eq("workspace_id", workspaceId).not("phone", "is", null).or(orFilter).limit(2000),
      admin.from("contacts").select("id, name, phone").eq("workspace_id", workspaceId).not("phone", "is", null).or(orFilter).limit(2000),
      admin.from("companies").select("id, name, phone").eq("workspace_id", workspaceId).not("phone", "is", null).or(orFilter).limit(2000),
    ]);

    type Row = { id: string; name: string; phone: string };
    const byKey: Record<Tier, Map<string, Row[]>> = {
      contact: new Map(),
      lead: new Map(),
      company: new Map(),
    };

    const indexRows = (rows: Array<{ id: string; name: string | null; phone: string | null }> | null, tier: Tier) => {
      if (!rows) return;
      for (const r of rows) {
        if (!r.phone || !r.name) continue;
        const n = normalizePhone(r.phone);
        if (!n) continue;
        const arr = byKey[tier].get(n.key) || [];
        arr.push({ id: r.id, name: r.name, phone: r.phone });
        byKey[tier].set(n.key, arr);
      }
    };
    indexRows(contactsRes.data as Array<{ id: string; name: string | null; phone: string | null }> | null, "contact");
    indexRows(leadsRes.data as Array<{ id: string; name: string | null; phone: string | null }> | null, "lead");
    indexRows(companiesRes.data as Array<{ id: string; name: string | null; phone: string | null }> | null, "company");

    // 5) Decide per conversation.
    const resolutions: Array<{
      conversation_id: string;
      workspace_id: string;
      resolved_type: Tier;
      resolved_entity_id: string;
      resolved_entity_name: string;
      matched_phone: string;
      normalized_e164: string | null;
      ambiguous: boolean;
      candidates_count: number;
      resolved_at: string;
    }> = [];

    for (const cn of convNorms) {
      for (const tier of ["contact", "lead", "company"] as const) {
        const candidates = byKey[tier].get(cn.key);
        if (!candidates || candidates.length === 0) continue;
        const uniq = Array.from(new Map(candidates.map((c) => [c.id, c])).values());
        const ambiguous = uniq.length > 1;
        resolutions.push({
          conversation_id: cn.convId,
          workspace_id: workspaceId,
          resolved_type: tier,
          resolved_entity_id: uniq[0].id,
          resolved_entity_name: uniq[0].name,
          matched_phone: uniq[0].phone,
          normalized_e164: cn.key.startsWith("+") ? cn.key : null,
          ambiguous,
          candidates_count: uniq.length,
          resolved_at: new Date().toISOString(),
        });
        break;
      }
    }

    let upserted = 0;
    let linked = 0;
    let ambiguousCount = 0;

    if (resolutions.length > 0) {
      const { error: upErr } = await admin
        .from("conversation_contact_resolutions")
        .upsert(resolutions, { onConflict: "conversation_id" });
      if (upErr) throw upErr;
      upserted = resolutions.length;

      // Auto-link unambiguous matches.
      const colMap: Record<Tier, "lead_id" | "contact_id" | "company_id"> = {
        lead: "lead_id",
        contact: "contact_id",
        company: "company_id",
      };
      const groupBy: Record<Tier, Map<string, string[]>> = {
        contact: new Map(),
        lead: new Map(),
        company: new Map(),
      };
      for (const r of resolutions) {
        if (r.ambiguous) {
          ambiguousCount++;
          continue;
        }
        const g = groupBy[r.resolved_type];
        const arr = g.get(r.resolved_entity_id) || [];
        arr.push(r.conversation_id);
        g.set(r.resolved_entity_id, arr);
      }

      for (const tier of ["contact", "lead", "company"] as const) {
        for (const [entityId, convIds] of groupBy[tier].entries()) {
          const { error } = await admin
            .from("conversations")
            .update({ [colMap[tier]]: entityId })
            .in("id", convIds)
            .is(colMap[tier], null);
          if (!error) linked += convIds.length;
        }
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        processed: toResolve.length,
        resolved: upserted,
        linked,
        ambiguous: ambiguousCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[inbox-resolve-contacts] error", err);
    return new Response(
      JSON.stringify({ ok: false, error: "internal_error", message: String((err as Error)?.message || err) }),
      // 200 fallback per project pattern — clients won't crash on this resilient endpoint.
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
