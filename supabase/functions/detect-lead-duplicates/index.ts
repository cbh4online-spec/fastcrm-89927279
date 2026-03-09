import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

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
    if (!authHeader) throw new Error("Missing authorization");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { workspace_id } = await req.json();
    if (!workspace_id) throw new Error("workspace_id required");

    // Clear old pending groups for this workspace
    await supabase
      .from("lead_duplicate_groups")
      .delete()
      .eq("workspace_id", workspace_id)
      .eq("status", "pending");

    // Fetch all active leads
    const { data: leads, error: leadsErr } = await supabase
      .from("leads")
      .select("id, name, email, phone, tax_id, external_username, external_instagram_id, ghl_contact_id, company_name, city, source, website, created_at, updated_at")
      .eq("workspace_id", workspace_id)
      .is("deleted_at", null)
      .order("created_at", { ascending: true })
      .limit(1000);

    if (leadsErr) throw leadsErr;
    if (!leads?.length) return new Response(JSON.stringify({ groups: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

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

    // === LEVEL 2: Strong Duplicates (confidence 75-94%) ===
    // Same email domain + similar name
    for (let i = 0; i < leads.length; i++) {
      for (let j = i + 1; j < leads.length; j++) {
        const a = leads[i], b = leads[j];
        const pk = pairKey(a.id, b.id);
        if (processedPairs.has(pk)) continue;

        const matchedFields: string[] = [];
        let score = 0;

        // Similar name
        if (a.name && b.name) {
          const nameSim = levenshteinSimilarity(a.name, b.name);
          if (nameSim >= 0.85) { score += 40; matchedFields.push("name"); }
          else if (nameSim >= 0.70) { score += 20; matchedFields.push("name"); }
        }

        // Same company
        if (a.company_name && b.company_name) {
          const compSim = levenshteinSimilarity(a.company_name, b.company_name);
          if (compSim >= 0.80) { score += 25; matchedFields.push("company_name"); }
        }

        // Same email domain
        if (a.email && b.email) {
          const domA = extractEmailDomain(a.email);
          const domB = extractEmailDomain(b.email);
          if (domA && domB && domA === domB && !["gmail.com", "hotmail.com", "yahoo.com", "outlook.com"].includes(domA)) {
            score += 15; matchedFields.push("email_domain");
          }
        }

        // Same city
        if (a.city && b.city && normalizeString(a.city) === normalizeString(b.city)) {
          score += 10; matchedFields.push("city");
        }

        // Same source
        if (a.source && b.source && a.source === b.source) {
          score += 5; matchedFields.push("source");
        }

        if (score >= 50 && matchedFields.length >= 2) {
          processedPairs.add(pk);
          matches.push({
            lead_ids: [a.id, b.id],
            confidence: Math.min(score, 94),
            match_type: "strong",
            reason: `Correspondência forte: ${matchedFields.join(", ")}`,
            matched_fields: matchedFields,
            master_candidate_id: pickMaster([a, b]),
          });
        }
      }
    }

    // === LEVEL 3: Probable Duplicates (confidence 50-74%) ===
    for (let i = 0; i < leads.length; i++) {
      for (let j = i + 1; j < leads.length; j++) {
        const a = leads[i], b = leads[j];
        const pk = pairKey(a.id, b.id);
        if (processedPairs.has(pk)) continue;

        const matchedFields: string[] = [];
        let score = 0;

        // Similar name (lower threshold)
        if (a.name && b.name) {
          const sim = levenshteinSimilarity(a.name, b.name);
          if (sim >= 0.70) { score += 30; matchedFields.push("name"); }
        }

        // Similar company
        if (a.company_name && b.company_name) {
          const sim = levenshteinSimilarity(a.company_name, b.company_name);
          if (sim >= 0.65) { score += 15; matchedFields.push("company_name"); }
        }

        // Similar contact pattern (phone prefix)
        if (a.phone && b.phone) {
          const phoneA = normalizePhone(a.phone);
          const phoneB = normalizePhone(b.phone);
          if (phoneA.length >= 6 && phoneB.length >= 6 && phoneA.substring(0, 6) === phoneB.substring(0, 6)) {
            score += 10; matchedFields.push("phone_prefix");
          }
        }

        // Similar activity timing (created within 1 hour)
        const timeDiff = Math.abs(new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        if (timeDiff < 3600000) {
          score += 10; matchedFields.push("created_timing");
        }

        if (score >= 40 && matchedFields.includes("name")) {
          processedPairs.add(pk);
          matches.push({
            lead_ids: [a.id, b.id],
            confidence: Math.min(score, 74),
            match_type: "probable",
            reason: `Correspondência provável: ${matchedFields.join(", ")}`,
            matched_fields: matchedFields,
            master_candidate_id: pickMaster([a, b]),
          });
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
