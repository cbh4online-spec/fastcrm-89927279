import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function normalizeString(str: string): string {
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, "").trim();
}

function normalizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, "").slice(-9);
}

function extractEmailDomain(email: string): string {
  return email.split("@")[1]?.toLowerCase() || "";
}

function levenshteinSimilarity(s1: string, s2: string): number {
  const a = normalizeString(s1);
  const b = normalizeString(s2);
  if (a === b) return 1;
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  if (longer.length === 0) return 1;
  const costs: number[] = [];
  for (let i = 0; i <= shorter.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= longer.length; j++) {
      if (i === 0) { costs[j] = j; continue; }
      if (j > 0) {
        let newValue = costs[j - 1];
        if (shorter[i - 1] !== longer[j - 1]) {
          newValue = Math.min(newValue, lastValue, costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[longer.length] = lastValue;
  }
  return (longer.length - costs[longer.length]) / longer.length;
}

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  tax_id: string | null;
  external_username: string | null;
  external_instagram_id: string | null;
  ghl_contact_id: string | null;
  company_name: string | null;
  city: string | null;
  source: string | null;
  website: string | null;
  created_at: string;
  updated_at: string;
}

interface DuplicateMatch {
  lead_ids: string[];
  confidence: number;
  match_type: string;
  reason: string;
  matched_fields: string[];
  master_candidate_id: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Validate JWT
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claimsData.claims.sub;

    const { workspace_id } = await req.json();

    // Verify workspace membership
    const { data: membership } = await userClient
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspace_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (!membership) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Service role client for data operations
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    if (!workspace_id) throw new Error("workspace_id required");

    // Clear old pending groups for this workspace
    await supabase
      .from("lead_duplicate_groups")
      .delete()
      .eq("workspace_id", workspace_id)
      .eq("status", "pending");

    // Fetch all active leads (cap to keep function within CPU budget)
    const MAX_LEADS = 500;
    const { data: leads, error: leadsErr } = await supabase
      .from("leads")
      .select("id, name, email, phone, tax_id, external_username, external_instagram_id, ghl_contact_id, company_name, city, source, website, created_at, updated_at")
      .eq("workspace_id", workspace_id)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(MAX_LEADS);

    if (leadsErr) throw leadsErr;
    if (!leads?.length) return new Response(JSON.stringify({ groups: 0, total_leads_scanned: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const matches: DuplicateMatch[] = [];
    const processedPairs = new Set<string>();

    function pairKey(a: string, b: string): string {
      return [a, b].sort().join("_");
    }

    function pickMaster(items: Lead[]): string {
      // Most recently updated, with most data
      return items.sort((a, b) => {
        const aFields = [a.email, a.phone, a.company_name, a.city].filter(Boolean).length;
        const bFields = [b.email, b.phone, b.company_name, b.city].filter(Boolean).length;
        if (bFields !== aFields) return bFields - aFields;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      })[0].id;
    }

    // === LEVEL 1: Exact Duplicates (confidence 95-100%) ===
    const exactMaps: { field: string; extract: (l: Lead) => string | null }[] = [
      { field: "email", extract: l => l.email?.toLowerCase().trim() || null },
      { field: "phone", extract: l => l.phone ? normalizePhone(l.phone) : null },
      { field: "tax_id", extract: l => l.tax_id?.trim() || null },
      { field: "external_username", extract: l => l.external_username?.toLowerCase().trim() || null },
      { field: "ghl_contact_id", extract: l => l.ghl_contact_id?.trim() || null },
    ];

    for (const { field, extract } of exactMaps) {
      const map = new Map<string, Lead[]>();
      for (const lead of leads) {
        const val = extract(lead);
        if (val && val.length > 0) {
          const arr = map.get(val) || [];
          arr.push(lead);
          map.set(val, arr);
        }
      }
      for (const [val, group] of map) {
        if (group.length < 2) continue;
        const ids = group.map(l => l.id);
        const allPaired = ids.every((a, i) => ids.slice(i + 1).every(b => processedPairs.has(pairKey(a, b))));
        if (allPaired) continue;
        ids.forEach((a, i) => ids.slice(i + 1).forEach(b => processedPairs.add(pairKey(a, b))));
        matches.push({
          lead_ids: ids,
          confidence: 98,
          match_type: "exact",
          reason: `${field} idêntico: ${val}`,
          matched_fields: [field],
          master_candidate_id: pickMaster(group),
        });
      }
    }

    // === Blocking strategy: only compare leads sharing first 2 normalized chars of the name ===
    // Reduces pairs from O(n²) (~125k for n=500) to a much smaller subset.
    const buckets = new Map<string, Lead[]>();
    for (const lead of leads) {
      const norm = normalizeString(lead.name || "");
      if (!norm) continue;
      const key = norm.substring(0, 2);
      const arr = buckets.get(key) || [];
      arr.push(lead);
      buckets.set(key, arr);
    }

    const startTime = Date.now();
    const TIME_BUDGET_MS = 1500; // leave headroom under the 2s CPU limit
    let timedOut = false;

    outer:
    for (const bucketLeads of buckets.values()) {
      if (bucketLeads.length < 2) continue;

      for (let i = 0; i < bucketLeads.length; i++) {
        if (Date.now() - startTime > TIME_BUDGET_MS) { timedOut = true; break outer; }

        for (let j = i + 1; j < bucketLeads.length; j++) {
          const a = bucketLeads[i], b = bucketLeads[j];
          const pk = pairKey(a.id, b.id);
          if (processedPairs.has(pk)) continue;

          const matchedFields: string[] = [];
          let score = 0;

          // Similar name
          let nameSim = 0;
          if (a.name && b.name) {
            nameSim = levenshteinSimilarity(a.name, b.name);
            if (nameSim >= 0.85) { score += 40; matchedFields.push("name"); }
            else if (nameSim >= 0.70) { score += 30; matchedFields.push("name"); }
          }

          // Same company
          if (a.company_name && b.company_name) {
            const compSim = levenshteinSimilarity(a.company_name, b.company_name);
            if (compSim >= 0.80) { score += 25; matchedFields.push("company_name"); }
            else if (compSim >= 0.65) { score += 15; matchedFields.push("company_name"); }
          }

          // Same email domain (excluding free providers)
          if (a.email && b.email) {
            const domA = extractEmailDomain(a.email);
            const domB = extractEmailDomain(b.email);
            if (domA && domB && domA === domB && !["gmail.com", "hotmail.com", "yahoo.com", "outlook.com"].includes(domA)) {
              score += 15; matchedFields.push("email_domain");
            }
          }

          // Phone prefix
          if (a.phone && b.phone) {
            const phoneA = normalizePhone(a.phone);
            const phoneB = normalizePhone(b.phone);
            if (phoneA.length >= 6 && phoneB.length >= 6 && phoneA.substring(0, 6) === phoneB.substring(0, 6)) {
              score += 10; matchedFields.push("phone_prefix");
            }
          }

          // Same city
          if (a.city && b.city && normalizeString(a.city) === normalizeString(b.city)) {
            score += 10; matchedFields.push("city");
          }

          // Created within 1 hour
          const timeDiff = Math.abs(new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          if (timeDiff < 3600000) {
            score += 5; matchedFields.push("created_timing");
          }

          // Same source
          if (a.source && b.source && a.source === b.source) {
            score += 5; matchedFields.push("source");
          }

          if (score >= 50 && matchedFields.length >= 2) {
            processedPairs.add(pk);
            const matchType = score >= 75 ? "strong" : "probable";
            const cap = matchType === "strong" ? 94 : 74;
            matches.push({
              lead_ids: [a.id, b.id],
              confidence: Math.min(score, cap),
              match_type: matchType,
              reason: `Correspondência ${matchType === "strong" ? "forte" : "provável"}: ${matchedFields.join(", ")}`,
              matched_fields: matchedFields,
              master_candidate_id: pickMaster([a, b]),
            });
          }
        }
      }
    }

    // === Persist to DB ===
    let groupsCreated = 0;
    for (const match of matches) {
      const { data: group, error: gErr } = await supabase
        .from("lead_duplicate_groups")
        .insert({
          workspace_id,
          confidence_score: match.confidence,
          duplicate_reason: match.reason,
          match_type: match.match_type,
          matched_fields: match.matched_fields,
          status: "pending",
        })
        .select("id")
        .single();

      if (gErr) { console.error("Group insert error:", gErr); continue; }

      const items = match.lead_ids.map(lead_id => ({
        group_id: group.id,
        lead_id,
        is_master_candidate: lead_id === match.master_candidate_id,
      }));

      const { error: iErr } = await supabase
        .from("lead_duplicate_group_items")
        .insert(items);

      if (iErr) console.error("Items insert error:", iErr);
      else groupsCreated++;
    }

    return new Response(
      JSON.stringify({ groups: groupsCreated, total_leads_scanned: leads.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("detect-lead-duplicates error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
