// Receives CloudTalk call events. Authenticated by the per-workspace secret token in the URL.
import { createClient } from "npm:@supabase/supabase-js@2";
import { normalizeCloudtalkCall } from "../_shared/cloudtalk.ts";
import { phoneOptOutVariants } from "../_shared/phoneVariants.ts";

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const token = new URL(req.url).searchParams.get("token") ?? "";
  if (!/^[a-f0-9]{48}$/.test(token)) return json({ error: "unauthorized" }, 401);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  const { data: conn } = await admin
    .from("cloudtalk_connections").select("workspace_id, enabled").eq("webhook_token", token).maybeSingle();
  if (!conn || !conn.enabled) return json({ error: "unauthorized" }, 401);

  let payload: Record<string, unknown>;
  try {
    const text = await req.text();
    if (text.length > 200_000) return json({ error: "payload_too_large" }, 413);
    payload = JSON.parse(text);
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  const call = normalizeCloudtalkCall(payload);
  if (!call) return json({ ok: true, ignored: "no_call_id" });

  const ws = conn.workspace_id;
  let contact_id: string | null = null, lead_id: string | null = null, company_id: string | null = null;
  const variants = phoneOptOutVariants(call.external_number);
  if (variants.length) {
    const { data: c } = await admin.from("contacts").select("id, company_id")
      .eq("workspace_id", ws).in("phone", variants).limit(1).maybeSingle();
    if (c) { contact_id = c.id; company_id = (c as any).company_id ?? null; }
    else {
      const { data: l } = await admin.from("leads").select("id")
        .eq("workspace_id", ws).in("phone", variants).limit(1).maybeSingle();
      if (l) lead_id = l.id;
    }
  }

  // Merge with existing row so later events (recording ready) don't erase earlier fields.
  const { data: existing } = await admin.from("cloudtalk_calls").select("*")
    .eq("workspace_id", ws).eq("external_call_id", call.external_call_id).maybeSingle();
  const merged: Record<string, unknown> = { ...(existing ?? {}) };
  for (const [k, v] of Object.entries(call)) if (v !== null) merged[k] = v;
  const ai = extractCloudtalkAi(payload);
  if (ai.transcript) merged.transcript = ai.transcript;
  if (ai.summary) {
    merged.summary = ai.summary;
    merged.ai_source = "cloudtalk";
    merged.ai_status = "done";
    merged.ai_generated_at = new Date().toISOString();
  }
  if (ai.sentiment) merged.sentiment = ai.sentiment;
  if (ai.action_items?.length) merged.action_items = ai.action_items;
  if (merged.transcript && !merged.summary && !merged.ai_status) merged.ai_status = "pending";
  delete merged.id;
  const row = {
    ...merged,
    workspace_id: ws,
    contact_id: (existing as any)?.contact_id ?? contact_id,
    lead_id: (existing as any)?.lead_id ?? lead_id,
    company_id: (existing as any)?.company_id ?? company_id,
    raw: payload,
    updated_at: new Date().toISOString(),
  };
  const { data: saved, error } = await admin.from("cloudtalk_calls")
    .upsert(row, { onConflict: "workspace_id,external_call_id" }).select("id, ai_status").single();
  if (error) {
    console.error("cloudtalk-webhook upsert failed", error.code);
    return json({ error: "store_failed" }, 500);
  }
  await admin.from("cloudtalk_connections").update({ last_event_at: new Date().toISOString() }).eq("workspace_id", ws);

  // Auto AI summary (opt-in per workspace); the summary function claims the row atomically.
  if (saved?.ai_status === "pending" && conn.auto_ai_summary) {
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const task = fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/cloudtalk-ai-summary`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId: ws, callId: saved.id }),
    }).catch((e) => console.error("auto summary trigger failed", (e as Error).message));
    // deno-lint-ignore no-explicit-any
    (globalThis as any).EdgeRuntime?.waitUntil?.(task);
  }
  return json({ ok: true });
});
