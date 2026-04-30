// Control Plane: Cohort Phases
// Returns phases for a specific cohort, OR for the active cohort of a course,
// OR for ALL active cohorts of a workspace. Frontend never queries Supabase
// directly for this data.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface Phase {
  id: string;
  workspace_id: string;
  cohort_id: string;
  phase_order: number;
  title: string;
  location: string | null;
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
  notes: string | null;
}

const ACTIVE_STATUSES = ["planned", "open", "running"] as const;

// Pick the most relevant active cohort for a given course.
// Priority: running > open > planned, then by start_date asc, then created_at desc.
function pickActiveCohort<T extends { status: string; start_date: string | null; created_at: string }>(
  cohorts: T[],
): T | null {
  if (!cohorts.length) return null;
  const rank: Record<string, number> = { running: 0, open: 1, planned: 2 };
  const sorted = [...cohorts].sort((a, b) => {
    const ra = rank[a.status] ?? 99;
    const rb = rank[b.status] ?? 99;
    if (ra !== rb) return ra - rb;
    const sa = a.start_date ?? "9999-12-31";
    const sb = b.start_date ?? "9999-12-31";
    if (sa !== sb) return sa.localeCompare(sb);
    return b.created_at.localeCompare(a.created_at);
  });
  return sorted[0];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json(401, { error: "unauthorized", fallback: { phases: [], cohort: null } });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      return json(401, { error: "unauthorized", fallback: { phases: [], cohort: null } });
    }
    const userId = claimsData.claims.sub as string;

    const url = new URL(req.url);
    const workspaceId = url.searchParams.get("workspace_id");
    const cohortId = url.searchParams.get("cohort_id");
    const courseId = url.searchParams.get("course_id");

    if (!workspaceId) {
      return json(400, { error: "workspace_id_required", fallback: { phases: [], cohort: null } });
    }

    const admin = createClient(SUPABASE_URL, SERVICE);

    // Verify membership (or super admin)
    const { data: isSuper } = await admin.rpc("is_super_admin", { _user_id: userId });
    if (!isSuper) {
      const { data: member } = await admin
        .from("workspace_members")
        .select("user_id")
        .eq("workspace_id", workspaceId)
        .eq("user_id", userId)
        .maybeSingle();
      if (!member) {
        return json(403, { error: "forbidden", fallback: { phases: [], cohort: null } });
      }
    }

    // Mode A: explicit cohort_id
    if (cohortId) {
      const { data: cohort, error: cErr } = await admin
        .from("sj_cohorts")
        .select("id, workspace_id, course_id, name, status, start_date, end_date")
        .eq("id", cohortId)
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      if (cErr) {
        return json(200, { phases: [], cohort: null, fallback: true, error: cErr.message });
      }
      if (!cohort) return json(200, { phases: [], cohort: null });
      const { data: phases } = await admin
        .from("sj_course_phases")
        .select("*")
        .eq("cohort_id", cohortId)
        .order("phase_order", { ascending: true });
      return json(200, { phases: (phases ?? []) as Phase[], cohort });
    }

    // Mode B: course_id → resolve active cohort, then phases
    if (courseId) {
      const { data: cohorts } = await admin
        .from("sj_cohorts")
        .select("id, workspace_id, course_id, name, status, start_date, end_date, created_at")
        .eq("workspace_id", workspaceId)
        .eq("course_id", courseId)
        .in("status", ACTIVE_STATUSES as unknown as string[]);
      const active = pickActiveCohort(cohorts ?? []);
      if (!active) return json(200, { phases: [], cohort: null });
      const { data: phases } = await admin
        .from("sj_course_phases")
        .select("*")
        .eq("cohort_id", active.id)
        .order("phase_order", { ascending: true });
      return json(200, { phases: (phases ?? []) as Phase[], cohort: active });
    }

    // Mode C: workspace-wide → return active cohorts and their phases
    const { data: cohorts } = await admin
      .from("sj_cohorts")
      .select("id, workspace_id, course_id, name, status, start_date, end_date, created_at")
      .eq("workspace_id", workspaceId)
      .in("status", ACTIVE_STATUSES as unknown as string[]);

    if (!cohorts?.length) return json(200, { cohorts: [], phasesByCohort: {} });

    // Pick active cohort per course
    const byCourse = new Map<string, typeof cohorts>();
    for (const c of cohorts) {
      const arr = byCourse.get(c.course_id) ?? [];
      arr.push(c);
      byCourse.set(c.course_id, arr);
    }
    const activeCohorts = Array.from(byCourse.values())
      .map((arr) => pickActiveCohort(arr))
      .filter((x): x is NonNullable<typeof x> => !!x);

    const ids = activeCohorts.map((c) => c.id);
    const { data: phases } = await admin
      .from("sj_course_phases")
      .select("*")
      .in("cohort_id", ids)
      .order("phase_order", { ascending: true });

    const phasesByCohort: Record<string, Phase[]> = {};
    for (const id of ids) phasesByCohort[id] = [];
    for (const p of (phases ?? []) as Phase[]) {
      (phasesByCohort[p.cohort_id] ??= []).push(p);
    }

    return json(200, { cohorts: activeCohorts, phasesByCohort });
  } catch (e) {
    console.error("[cp-cohort-phases] internal_error", e);
    return json(200, {
      phases: [],
      cohort: null,
      cohorts: [],
      phasesByCohort: {},
      fallback: true,
      internal_error: e instanceof Error ? e.message : "unknown",
    });
  }
});
