import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface OptSettings {
  is_enabled: boolean;
  auto_optimize_enabled: boolean;
  min_samples_threshold: number;
  min_score_delta: number;
  min_revenue_delta: number;
  optimization_window_days: number;
  allow_auto_pause: boolean;
  allow_auto_promote: boolean;
  allow_auto_switch_variant: boolean;
}

const DEFAULT_SETTINGS: OptSettings = {
  is_enabled: false,
  auto_optimize_enabled: false,
  min_samples_threshold: 50,
  min_score_delta: 0.1,
  min_revenue_delta: 50,
  optimization_window_days: 30,
  allow_auto_pause: false,
  allow_auto_promote: false,
  allow_auto_switch_variant: false,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const body = await req.json().catch(() => ({}));
    const { workspace_id } = body;

    // Get workspaces to process
    let workspaceIds: string[] = [];
    if (workspace_id) {
      workspaceIds = [workspace_id];
    } else {
      const { data: enabledSettings } = await supabase
        .from("optimization_settings")
        .select("workspace_id")
        .eq("is_enabled", true);
      workspaceIds = (enabledSettings || []).map((s: any) => s.workspace_id);
    }

    if (workspaceIds.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, message: "No workspaces to process", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let totalRecommendations = 0;
    let totalAutoApplied = 0;

    for (const wsId of workspaceIds) {
      // Load settings
      const { data: settingsRow } = await supabase
        .from("optimization_settings")
        .select("*")
        .eq("workspace_id", wsId)
        .maybeSingle();
      
      const settings: OptSettings = settingsRow || DEFAULT_SETTINGS;

      // Load template stats grouped by template_id
      const { data: allStats } = await supabase
        .from("workspace_template_stats")
        .select("*")
        .eq("workspace_id", wsId);

      if (!allStats || allStats.length === 0) continue;

      // Group stats by template_id
      const byTemplate: Record<string, any[]> = {};
      for (const s of allStats) {
        if (!byTemplate[s.template_id]) byTemplate[s.template_id] = [];
        byTemplate[s.template_id].push(s);
      }

      // Load variants
      const { data: allVariants } = await supabase
        .from("communication_template_variants")
        .select("*")
        .eq("workspace_id", wsId);

      const variantsByTemplate: Record<string, any[]> = {};
      for (const v of (allVariants || [])) {
        if (!variantsByTemplate[v.template_id]) variantsByTemplate[v.template_id] = [];
        variantsByTemplate[v.template_id].push(v);
      }

      // Load revenue attribution aggregates
      const { data: revenueData } = await supabase
        .from("communication_attributions")
        .select("template_id, conversion_value, attribution_weight")
        .eq("workspace_id", wsId)
        .not("template_id", "is", null);

      const revenueByTemplate: Record<string, number> = {};
      for (const r of (revenueData || [])) {
        if (r.template_id) {
          revenueByTemplate[r.template_id] = (revenueByTemplate[r.template_id] || 0) +
            (Number(r.conversion_value) * Number(r.attribution_weight));
        }
      }

      const recommendations: any[] = [];

      // --- Analyze each template with variants ---
      for (const [templateId, variants] of Object.entries(variantsByTemplate)) {
        const templateStats = byTemplate[templateId] || [];
        if (variants.length < 2) continue;

        // Build variant performance map
        const variantPerf: { variantId: string; key: string; isActive: boolean; score: number; weightedScore: number; samples: number }[] = [];
        
        for (const v of variants) {
          const stat = templateStats.find((s: any) => s.variant_key === v.variant_key);
          variantPerf.push({
            variantId: v.id,
            key: v.variant_key,
            isActive: v.is_active,
            score: stat?.score ?? 0,
            weightedScore: stat?.weighted_score ?? stat?.score ?? 0,
            samples: stat?.samples ?? 0,
          });
        }

        const activeVariants = variantPerf.filter(v => v.isActive);
        if (activeVariants.length < 2) continue;

        // Sort by weighted score desc
        activeVariants.sort((a, b) => b.weightedScore - a.weightedScore);
        const best = activeVariants[0];
        const worst = activeVariants[activeVariants.length - 1];

        // Check min samples
        if (best.samples < settings.min_samples_threshold || worst.samples < settings.min_samples_threshold) continue;

        const scoreDelta = best.weightedScore - worst.weightedScore;

        // promote_variant: best variant clearly superior
        if (scoreDelta >= settings.min_score_delta && best.weightedScore > 0.5) {
          recommendations.push({
            workspace_id: wsId,
            entity_type: "variant",
            entity_id: best.variantId,
            recommendation_type: "promote_variant",
            title: `Promover variante "${best.key}" — score superior`,
            rationale: `Variante "${best.key}" tem score ${(best.weightedScore * 100).toFixed(1)}% vs ${(worst.weightedScore * 100).toFixed(1)}% da pior variante. Delta de ${(scoreDelta * 100).toFixed(1)}pp com ${best.samples} amostras.`,
            suggested_action_json: { action: "promote", variant_id: best.variantId, template_id: templateId },
            confidence: scoreDelta > settings.min_score_delta * 2 ? "high" : "medium",
            impact_estimate: scoreDelta * 100,
            auto_applicable: settings.auto_optimize_enabled && settings.allow_auto_promote,
          });
        }

        // pause_variant: worst is significantly worse
        if (worst.weightedScore < best.weightedScore * 0.5 && worst.samples >= settings.min_samples_threshold) {
          recommendations.push({
            workspace_id: wsId,
            entity_type: "variant",
            entity_id: worst.variantId,
            recommendation_type: "pause_variant",
            title: `Pausar variante fraca "${worst.key}"`,
            rationale: `Variante "${worst.key}" tem score ${(worst.weightedScore * 100).toFixed(1)}% — menos de metade da melhor (${(best.weightedScore * 100).toFixed(1)}%). ${worst.samples} amostras avaliadas.`,
            suggested_action_json: { action: "pause", variant_id: worst.variantId, template_id: templateId },
            confidence: worst.samples >= settings.min_samples_threshold * 2 ? "high" : "medium",
            impact_estimate: scoreDelta * 50,
            auto_applicable: settings.auto_optimize_enabled && settings.allow_auto_pause,
          });
        }
      }

      // --- highlight_top_revenue_template ---
      const revEntries = Object.entries(revenueByTemplate).sort((a, b) => b[1] - a[1]);
      if (revEntries.length > 0 && revEntries[0][1] >= settings.min_revenue_delta) {
        const [topTemplateId, topRevenue] = revEntries[0];
        recommendations.push({
          workspace_id: wsId,
          entity_type: "template",
          entity_id: topTemplateId,
          recommendation_type: "highlight_top_revenue_template",
          title: `Template com maior receita atribuída`,
          rationale: `Este template gerou €${topRevenue.toFixed(2)} em receita atribuída — o mais alto do workspace.`,
          suggested_action_json: { action: "highlight", template_id: topTemplateId, revenue: topRevenue },
          confidence: "high",
          impact_estimate: topRevenue,
          auto_applicable: false,
        });
      }

      // --- Insert recommendations (idempotent) ---
      for (const rec of recommendations) {
        const { error } = await supabase.from("optimization_recommendations").upsert(
          {
            ...rec,
            status: "open",
            auto_applied: false,
          },
          { onConflict: "workspace_id,entity_type,entity_id,recommendation_type", ignoreDuplicates: true }
        );
        if (!error) totalRecommendations++;
      }

      // --- Expire old open recommendations ---
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() - settings.optimization_window_days);
      await supabase
        .from("optimization_recommendations")
        .update({ status: "expired", updated_at: new Date().toISOString() })
        .eq("workspace_id", wsId)
        .eq("status", "open")
        .lt("created_at", expiryDate.toISOString());

      // --- Auto-apply high confidence recommendations ---
      if (settings.auto_optimize_enabled) {
        const { data: autoRecs } = await supabase
          .from("optimization_recommendations")
          .select("*")
          .eq("workspace_id", wsId)
          .eq("status", "open")
          .eq("auto_applicable", true)
          .eq("auto_applied", false)
          .eq("confidence", "high");

        for (const rec of (autoRecs || [])) {
          const action = rec.suggested_action_json;
          if (!action) continue;

          let beforeState: any = null;
          let afterState: any = null;
          let applied = false;

          if (rec.recommendation_type === "pause_variant" && settings.allow_auto_pause && action.variant_id) {
            const { data: before } = await supabase
              .from("communication_template_variants")
              .select("id, is_active, variant_key")
              .eq("id", action.variant_id)
              .maybeSingle();
            
            if (before && before.is_active) {
              beforeState = before;
              await supabase
                .from("communication_template_variants")
                .update({ is_active: false })
                .eq("id", action.variant_id);
              afterState = { ...before, is_active: false };
              applied = true;
            }
          }

          if (rec.recommendation_type === "promote_variant" && settings.allow_auto_promote && action.variant_id) {
            const { data: before } = await supabase
              .from("communication_template_variants")
              .select("id, is_active, variant_key")
              .eq("id", action.variant_id)
              .maybeSingle();
            
            if (before) {
              beforeState = before;
              await supabase
                .from("communication_template_variants")
                .update({ is_active: true })
                .eq("id", action.variant_id);
              afterState = { ...before, is_active: true };
              applied = true;
            }
          }

          if (applied) {
            await supabase
              .from("optimization_recommendations")
              .update({ status: "applied", auto_applied: true, applied_at: new Date().toISOString(), updated_at: new Date().toISOString() })
              .eq("id", rec.id);

            await supabase.from("optimization_action_logs").insert({
              workspace_id: wsId,
              recommendation_id: rec.id,
              action_type: rec.recommendation_type,
              target_entity_type: rec.entity_type,
              target_entity_id: rec.entity_id,
              before_json: beforeState,
              after_json: afterState,
              applied_by: "system",
              applied_mode: "auto",
            });

            totalAutoApplied++;
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        workspaces_processed: workspaceIds.length,
        recommendations_created: totalRecommendations,
        auto_applied: totalAutoApplied,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Optimization engine error:", error);
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
