import { createClient } from "@supabase/supabase-js";
import { corsHeaders } from "../_shared/cors.ts";

const log = (step: string, details?: unknown) =>
  console.log(`[IG-EXTRACT-START] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);

const USERNAME_RE = /^[A-Za-z0-9._]{1,60}$/;
const SOURCES = ["followers", "following", "hashtag", "location", "list"] as const;
type Source = (typeof SOURCES)[number];

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

    const { data: userData, error: userError } = await admin.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    const user = userData?.user;
    if (userError || !user) return json({ success: false, error: "Sem autenticação" }, 401);

    const body = await req.json().catch(() => null);
    const workspaceId = body?.workspaceId;
    const source = body?.source as Source;
    const rawTarget = typeof body?.target === "string" ? body.target.trim() : "";
    const limitCount = Number(body?.limit ?? 200);
    const usernames: unknown = body?.usernames;

    if (!workspaceId || typeof workspaceId !== "string") {
      return json({ success: false, error: "Workspace inválido" }, 400);
    }
    if (!SOURCES.includes(source)) {
      return json({ success: false, error: "Origem inválida" }, 400);
    }
    if (!Number.isFinite(limitCount) || limitCount < 1 || limitCount > 20000) {
      return json({ success: false, error: "Limite inválido (1 a 20000)" }, 400);
    }

    // Pertença ao workspace (fail-closed) e papel
    const { data: member } = await admin
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!member) return json({ success: false, error: "Sem acesso a este workspace" }, 403);
    if (member.role === "viewer") {
      return json({ success: false, error: "Sem permissão para recolher perfis" }, 403);
    }

    let seed: string[] = [];
    let target = rawTarget;

    if (source === "list") {
      const list = Array.isArray(usernames) ? usernames : String(rawTarget).split(/[\s,;]+/);
      seed = [
        ...new Set(
          list
            .map((u) => String(u).trim().replace(/^@/, "").replace(/\/+$/, "").toLowerCase())
            .filter((u) => USERNAME_RE.test(u)),
        ),
      ].slice(0, limitCount);
      if (seed.length === 0) {
        return json({ success: false, error: "Nenhum @perfil válido na lista" }, 400);
      }
      target = `${seed.length} perfis colados`;
    } else if (source === "followers" || source === "following") {
      target = rawTarget.replace(/^@/, "").replace(/^.*instagram\.com\//, "").replace(/\/.*$/, "");
      if (!USERNAME_RE.test(target)) {
        return json({ success: false, error: "@perfil inválido" }, 400);
      }
    } else {
      if (target.length < 2 || target.length > 100) {
        return json({ success: false, error: "Termo inválido" }, 400);
      }
      target = target.replace(/^#/, "");
    }

    const { data: job, error: jobError } = await admin
      .from("instagram_extraction_jobs")
      .insert({
        workspace_id: workspaceId,
        created_by: user.id,
        source,
        target,
        limit_count: limitCount,
        status: "pending",
        listing_done: source === "list",
        queued_count: seed.length,
      })
      .select("id")
      .single();

    if (jobError || !job) throw new Error(jobError?.message ?? "Falha ao criar o trabalho");

    if (seed.length > 0) {
      const rows = seed.map((username) => ({
        job_id: job.id,
        workspace_id: workspaceId,
        username,
      }));
      for (let i = 0; i < rows.length; i += 500) {
        const { error } = await admin
          .from("instagram_extraction_items")
          .upsert(rows.slice(i, i + 500), { onConflict: "job_id,username", ignoreDuplicates: true });
        if (error) throw new Error(error.message);
      }
    }

    await admin.from("activity_logs").insert({
      workspace_id: workspaceId,
      user_id: user.id,
      action: "instagram_extraction_started",
      entity_type: "instagram_extraction_job",
      entity_id: job.id,
      details: { source, target, limit: limitCount },
    }).then(() => undefined, () => undefined);

    // Arranca o worker sem esperar pelo resultado
    admin.functions
      .invoke("instagram-extract-worker", { body: { jobId: job.id } })
      .then(() => undefined, (e) => log("worker kick failed", { error: String(e) }));

    log("Job created", { jobId: job.id, source, seed: seed.length });
    return json({ success: true, jobId: job.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log("ERROR", { message });
    return json({ success: false, error: message }, 500);
  }
});
