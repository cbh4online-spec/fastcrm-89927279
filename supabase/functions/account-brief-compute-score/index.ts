import { createClient } from "@supabase/supabase-js";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { accountId, workspaceId, extractedData, runId } = await req.json();
    if (!accountId || !workspaceId) {
      return new Response(JSON.stringify({ error: "accountId e workspaceId obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get ICP
    const { data: icpProfile } = await supabase
      .from("account_brief_icp_profiles")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("is_default", true)
      .maybeSingle();

    // Get extracted data if not provided
    let data = extractedData;
    if (!data) {
      const { data: snapshots } = await supabase
        .from("account_brief_page_snapshots")
        .select("extracted_structured_json")
        .eq("account_id", accountId)
        .eq("workspace_id", workspaceId)
        .not("extracted_structured_json", "is", null)
        .order("created_at", { ascending: false })
        .limit(1);
      data = snapshots?.[0]?.extracted_structured_json;
    }

    if (!data) {
      // Can't score without data — set a default low score
      await supabase.from("account_brief_accounts").update({
        total_score: 0, score_label: "Baixo", updated_at: new Date().toISOString(),
      }).eq("id", accountId);
      return new Response(JSON.stringify({ success: true, score: 0, label: "Baixo" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const signals = data.signals || {};
    const identity = data.identity || {};
    const offer = data.offer || {};
    const personalization = data.personalization || {};

    // === Deterministic scoring ===
    const factors: Array<{ type: string; label: string; value: number; weight: number; polarity: string; explanation: string }> = [];

    // 1. ICP Fit (0-25)
    let icpFit = 0;
    if (icpProfile) {
      if (icpProfile.industry && identity.probable_sector?.toLowerCase().includes(icpProfile.industry.toLowerCase())) {
        icpFit += 10;
        factors.push({ type: "icp_fit", label: "Setor coincide com ICP", value: 10, weight: 1, polarity: "positive", explanation: `Setor "${identity.probable_sector}" alinha com ICP "${icpProfile.industry}"` });
      }
      if (icpProfile.geography && identity.probable_geography?.toLowerCase().includes(icpProfile.geography.toLowerCase())) {
        icpFit += 8;
        factors.push({ type: "icp_fit", label: "Geografia coincide", value: 8, weight: 1, polarity: "positive", explanation: `Opera em "${identity.probable_geography}", alinhado com ICP` });
      }
      if (icpProfile.company_type) {
        const sizeMap: Record<string, string[]> = {
          startup: ["startup"], pme: ["pme", "smb"], enterprise: ["enterprise", "mid_market"],
        };
        if (sizeMap[icpProfile.company_type.toLowerCase()]?.includes(signals.company_size_indicator || "")) {
          icpFit += 7;
          factors.push({ type: "icp_fit", label: "Porte alinhado", value: 7, weight: 1, polarity: "positive", explanation: `Porte "${signals.company_size_indicator}" alinhado com ICP` });
        }
      }
    } else {
      icpFit = 12; // Neutral if no ICP defined
    }

    // 2. Growth signals (0-25)
    let growthScore = 0;
    const growthSignals = signals.growth_signals || [];
    if (growthSignals.length > 0) {
      growthScore += Math.min(growthSignals.length * 5, 15);
      factors.push({ type: "growth", label: "Sinais de crescimento", value: growthScore, weight: 1, polarity: "positive", explanation: growthSignals.slice(0, 3).join("; ") });
    }
    if (signals.hiring_active) {
      growthScore += 5;
      factors.push({ type: "growth", label: "Contratação ativa", value: 5, weight: 1, polarity: "positive", explanation: signals.hiring_areas?.join(", ") || "Tem página de careers ativa" });
    }
    if (signals.expansion_signals?.length) {
      growthScore += 5;
      factors.push({ type: "growth", label: "Sinais de expansão", value: 5, weight: 1, polarity: "positive", explanation: signals.expansion_signals.slice(0, 2).join("; ") });
    }
    growthScore = Math.min(growthScore, 25);

    // 3. Commercial maturity (0-25)
    let maturityScore = 0;
    const maturityChecks = [
      { key: "has_pricing", label: "Tem pricing", points: 4 },
      { key: "has_case_studies", label: "Tem case studies", points: 4 },
      { key: "has_customers_page", label: "Tem página de clientes", points: 3 },
      { key: "has_partners", label: "Tem parceiros", points: 3 },
      { key: "has_integrations", label: "Tem integrações", points: 3 },
      { key: "has_docs", label: "Tem documentação", points: 3 },
    ];
    for (const check of maturityChecks) {
      if (signals[check.key]) {
        maturityScore += check.points;
        factors.push({ type: "maturity", label: check.label, value: check.points, weight: 1, polarity: "positive", explanation: `Presença de ${check.label.toLowerCase()} indica maturidade comercial` });
      }
    }
    if (offer.main_products_services?.length >= 3) {
      maturityScore += 3;
      factors.push({ type: "maturity", label: "Oferta clara", value: 3, weight: 1, polarity: "positive", explanation: `${offer.main_products_services.length} produtos/serviços identificados` });
    }
    if (offer.value_proposition) {
      maturityScore += 2;
      factors.push({ type: "maturity", label: "Proposta de valor clara", value: 2, weight: 1, polarity: "positive", explanation: "Proposta de valor bem definida no site" });
    }
    maturityScore = Math.min(maturityScore, 25);

    // 4. Personalization potential (0-25)
    let persScore = 0;
    if (personalization.outreach_angles?.length) {
      persScore += Math.min(personalization.outreach_angles.length * 4, 12);
      factors.push({ type: "personalization", label: "Ângulos de outreach", value: Math.min(personalization.outreach_angles.length * 4, 12), weight: 1, polarity: "positive", explanation: `${personalization.outreach_angles.length} ângulos identificados` });
    }
    if (personalization.dominant_themes?.length >= 2) {
      persScore += 5;
      factors.push({ type: "personalization", label: "Temas dominantes claros", value: 5, weight: 1, polarity: "positive", explanation: personalization.dominant_themes.slice(0, 3).join(", ") });
    }
    if (personalization.main_cta) {
      persScore += 4;
      factors.push({ type: "personalization", label: "CTA principal identificado", value: 4, weight: 1, polarity: "positive", explanation: `CTA: "${personalization.main_cta}"` });
    }
    if (personalization.pain_hypotheses?.length) {
      persScore += 4;
      factors.push({ type: "personalization", label: "Hipóteses de dor", value: 4, weight: 1, polarity: "positive", explanation: `${personalization.pain_hypotheses.length} hipóteses identificadas` });
    }
    persScore = Math.min(persScore, 25);

    // Negative factors
    if (!identity.description_short) {
      factors.push({ type: "maturity", label: "Sem descrição clara", value: -3, weight: 1, polarity: "negative", explanation: "Não foi possível extrair uma descrição clara da empresa" });
      maturityScore = Math.max(0, maturityScore - 3);
    }
    if (!signals.industries_served?.length) {
      factors.push({ type: "icp_fit", label: "Indústrias não claras", value: -2, weight: 1, polarity: "negative", explanation: "Não foi possível identificar as indústrias servidas" });
      icpFit = Math.max(0, icpFit - 2);
    }

    const totalScore = Math.min(100, Math.max(0, icpFit + growthScore + maturityScore + persScore));
    const scoreLabel = totalScore >= 80 ? "Muito Alto" : totalScore >= 60 ? "Alto" : totalScore >= 40 ? "Médio" : "Baixo";

    // Generate reasoning
    const topPositive = factors.filter(f => f.polarity === "positive").sort((a, b) => b.value - a.value).slice(0, 3);
    const topNegative = factors.filter(f => f.polarity === "negative");
    const reasoning = [
      `Score ${totalScore}/100 (${scoreLabel}).`,
      topPositive.length ? `Pontos fortes: ${topPositive.map(f => f.label).join(", ")}.` : "",
      topNegative.length ? `Atenção: ${topNegative.map(f => f.label).join(", ")}.` : "",
    ].filter(Boolean).join(" ");

    // Save score
    await supabase.from("account_brief_scores").insert({
      workspace_id: workspaceId,
      account_id: accountId,
      analysis_run_id: runId || null,
      total_score: totalScore,
      score_label: scoreLabel,
      icp_fit_score: icpFit,
      growth_score: growthScore,
      maturity_score: maturityScore,
      personalization_score: persScore,
      reasoning_short: reasoning,
    });

    // Save factors
    if (factors.length) {
      await supabase.from("account_brief_score_factors").insert(
        factors.map(f => ({
          workspace_id: workspaceId,
          account_id: accountId,
          analysis_run_id: runId || null,
          factor_type: f.type,
          factor_label: f.label,
          factor_value: f.value,
          factor_weight: f.weight,
          polarity: f.polarity,
          explanation: f.explanation,
        }))
      );
    }

    // Update account
    await supabase.from("account_brief_accounts").update({
      total_score: totalScore,
      score_label: scoreLabel,
      updated_at: new Date().toISOString(),
    }).eq("id", accountId);

    console.log(`[score] Account ${accountId}: ${totalScore} (${scoreLabel})`);

    return new Response(JSON.stringify({
      success: true,
      score: totalScore,
      label: scoreLabel,
      subScores: { icpFit, growthScore, maturityScore, persScore },
      reasoning,
      factorsCount: factors.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[score] Error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
