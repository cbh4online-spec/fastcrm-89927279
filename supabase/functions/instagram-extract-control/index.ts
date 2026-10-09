import { createClient } from "@supabase/supabase-js";
import { abortRun, APIFY_PROVIDER, decodeCursor } from "../_shared/instagramApifyRelationships.ts";
import { corsHeaders } from "../_shared/cors.ts";

const log = (step: string, details?: unknown) =>
  console.log(`[IG-EXTRACT-CONTROL] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);

const ACTIONS = ["pause", "resume", "cancel"] as const;
type Action = (typeof ACTIONS)[number];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ success: false, error: "Sem autenticação" }, 401);

    const { data: userData } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    const user = userData?.user;
    if (!user) return json({ success: false, error: "Sem autenticação" }, 401);

    const body = await req.json().catch(() => null);
    const jobId = body?.jobId;
    const action = body?.action as Action;
    if (typeof jobId !== "string" || !ACTIONS.includes(action)) {
      return json({ success: false, error: "Pedido inválido" }, 400);
    }

    const { data: job } = await admin
      .from("instagram_extraction_jobs")
      .select("id, workspace_id, status, provider, next_cursor")
      .eq("id", jobId)
      .maybeSingle();

    if (!job) return json({ success: false, error: "Trabalho não encontrado" }, 404);

    const { data: member } = await admin
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", job.workspace_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!member) return json({ success: false, error: "Sem acesso a este workspace" }, 403);
    if (member.role === "viewer") {
      return json({ success: false, error: "Sem permissão para controlar o trabalho" }, 403);
    }

    const status = action === "pause" ? "paused" : action === "cancel" ? "cancelled" : "running";

    if (action !== "resume" && ["completed", "failed", "cancelled"].includes(job.status)) {
      return json({ success: true, status: job.status });
    }

    await admin
      .from("instagram_extraction_jobs")
      .update({
        status,
        lease_until: null,
        error: action === "resume" ? null : undefined,
        finished_at: action === "cancel" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    // Cancelar uma recolha Apify também pára a execução remota (deixa de gerar custo)
    if (action === "cancel" && job.provider === APIFY_PROVIDER) {
      const c = decodeCursor(job.next_cursor);
      if (c) await abortRun(c.runId).catch((e) => log("abort failed", { error: String(e) }));
    }

    if (action === "resume") {
      admin.functions
        .invoke("instagram-extract-worker", { body: { jobId } })
        .then(() => undefined, (e) => log("resume kick failed", { error: String(e) }));
    }

    log("Control applied", { jobId, action });
    return json({ success: true, status });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log("ERROR", { message });
    return json({ success: false, error: message }, 500);
  }
});
