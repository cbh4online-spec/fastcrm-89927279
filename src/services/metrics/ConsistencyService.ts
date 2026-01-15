// ============================================
// CONSISTENCY SERVICE
// ============================================
// Validates metric consistency across the system.
// Alerts when data is incomplete or inconsistent.

import { ConsistencyCheck, ConsistencyCheckItem, MetricWarning } from "@/types/metrics-governance";
import { METRICS_CATALOG } from "./MetricsCatalog";

interface DataSources {
  leads: any[];
  opportunities: any[];
  stages: any[];
  conversations: any[];
  automations: any[];
  proposals: any[];
  tasks: any[];
}

export class ConsistencyService {
  constructor(private data: DataSources) {}

  public runConsistencyChecks(): ConsistencyCheck {
    const checks: ConsistencyCheckItem[] = [];

    // Check 1: Opportunities with values
    checks.push(this.checkOpportunityValues());

    // Check 2: Leads with opportunities linkage
    checks.push(this.checkLeadOpportunityLinkage());

    // Check 3: Pipeline stages defined
    checks.push(this.checkPipelineStages());

    // Check 4: Data freshness
    checks.push(this.checkDataFreshness());

    // Check 5: Opportunity probabilities
    checks.push(this.checkOpportunityProbabilities());

    // Check 6: Automation configuration
    checks.push(this.checkAutomationConfig());

    const hasErrors = checks.some((c) => !c.passed);
    const hasWarnings = checks.some((c) => c.message.includes("aviso"));

    return {
      status: hasErrors ? "error" : hasWarnings ? "warning" : "valid",
      checks,
      lastChecked: new Date().toISOString(),
    };
  }

  private checkOpportunityValues(): ConsistencyCheckItem {
    const oppsWithoutValue = this.data.opportunities?.filter(
      (o) => o.status === "open" && (!o.value || o.value === 0)
    ).length || 0;
    const totalOpen = this.data.opportunities?.filter((o) => o.status === "open").length || 0;

    const passed = totalOpen === 0 || oppsWithoutValue / totalOpen < 0.3;

    return {
      checkName: "Valores de Oportunidades",
      passed,
      message: passed
        ? "Todas as oportunidades têm valores definidos"
        : `${oppsWithoutValue} de ${totalOpen} oportunidades sem valor. As previsões podem estar subestimadas.`,
      affectedMetrics: passed
        ? undefined
        : ["total_pipeline_value", "weighted_pipeline_value", "forecast_30d", "forecast_60d", "forecast_90d"],
    };
  }

  private checkLeadOpportunityLinkage(): ConsistencyCheckItem {
    const oppsWithLead = this.data.opportunities?.filter((o) => o.lead_id).length || 0;
    const totalOpps = this.data.opportunities?.length || 0;

    const passed = totalOpps === 0 || oppsWithLead / totalOpps > 0.5;

    return {
      checkName: "Ligação Lead-Oportunidade",
      passed,
      message: passed
        ? "A maioria das oportunidades está ligada a leads"
        : `Apenas ${Math.round((oppsWithLead / totalOpps) * 100)}% das oportunidades têm lead associado. Taxa de conversão pode ser imprecisa.`,
      affectedMetrics: passed ? undefined : ["lead_to_opportunity_rate"],
    };
  }

  private checkPipelineStages(): ConsistencyCheckItem {
    const stagesCount = this.data.stages?.length || 0;
    const stagesWithProbability = this.data.stages?.filter((s) => s.probability !== null).length || 0;

    const passed = stagesCount > 0 && stagesWithProbability === stagesCount;

    return {
      checkName: "Configuração de Pipeline",
      passed,
      message: passed
        ? "Pipeline configurado corretamente"
        : stagesCount === 0
        ? "Nenhum pipeline definido. Crie etapas para ativar previsões."
        : `${stagesCount - stagesWithProbability} etapas sem probabilidade definida.`,
      affectedMetrics: passed ? undefined : ["weighted_pipeline_value", "forecast_30d"],
    };
  }

  private checkDataFreshness(): ConsistencyCheckItem {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const recentLeads = this.data.leads?.filter(
      (l) => new Date(l.updated_at || l.created_at) > oneDayAgo
    ).length || 0;
    const recentOpps = this.data.opportunities?.filter(
      (o) => new Date(o.updated_at || o.created_at) > oneDayAgo
    ).length || 0;

    const hasRecentActivity = recentLeads > 0 || recentOpps > 0;

    return {
      checkName: "Dados Atualizados",
      passed: hasRecentActivity,
      message: hasRecentActivity
        ? "Dados atualizados recentemente"
        : "Sem atividade nas últimas 24 horas. As métricas refletem dados antigos.",
    };
  }

  private checkOpportunityProbabilities(): ConsistencyCheckItem {
    const oppsWithProbability = this.data.opportunities?.filter(
      (o) => o.status === "open" && o.probability !== null && o.probability !== undefined
    ).length || 0;
    const totalOpen = this.data.opportunities?.filter((o) => o.status === "open").length || 0;

    const passed = totalOpen === 0 || oppsWithProbability / totalOpen > 0.7;

    return {
      checkName: "Probabilidades Definidas",
      passed,
      message: passed
        ? "Probabilidades de fecho estão definidas"
        : `${totalOpen - oppsWithProbability} oportunidades sem probabilidade. Previsões usam valor padrão de 50%.`,
      affectedMetrics: passed ? undefined : ["weighted_pipeline_value", "forecast_30d", "forecast_60d"],
    };
  }

  private checkAutomationConfig(): ConsistencyCheckItem {
    const totalAutomations = this.data.automations?.length || 0;
    const activeAutomations = this.data.automations?.filter((a) => a.is_active).length || 0;

    const passed = totalAutomations === 0 || activeAutomations > 0;

    return {
      checkName: "Automações Configuradas",
      passed,
      message: passed
        ? totalAutomations === 0
          ? "Sem automações configuradas (aviso: considera criar para poupar tempo)"
          : `${activeAutomations} automações ativas`
        : "Existem automações mas nenhuma está ativa.",
      affectedMetrics: passed ? undefined : ["active_automations", "time_saved_hours"],
    };
  }

  // ============================================
  // DATA COMPLETENESS CHECK
  // ============================================

  public getDataCompletenessForMetric(metricId: string): number {
    const metric = METRICS_CATALOG[metricId];
    if (!metric) return 0;

    let completeness = 100;
    const issues: string[] = [];

    metric.dataSource.forEach((source) => {
      switch (source) {
        case "leads":
          if (!this.data.leads || this.data.leads.length === 0) {
            completeness -= 25;
            issues.push("Sem dados de leads");
          }
          break;
        case "opportunities":
          if (!this.data.opportunities || this.data.opportunities.length === 0) {
            completeness -= 25;
            issues.push("Sem dados de oportunidades");
          }
          break;
        case "pipeline_stages":
          if (!this.data.stages || this.data.stages.length === 0) {
            completeness -= 20;
            issues.push("Pipeline não configurado");
          }
          break;
        case "conversations":
          if (!this.data.conversations || this.data.conversations.length === 0) {
            completeness -= 15;
            issues.push("Sem conversas registadas");
          }
          break;
        case "tasks":
          if (!this.data.tasks || this.data.tasks.length === 0) {
            completeness -= 10;
            issues.push("Sem tarefas registadas");
          }
          break;
      }
    });

    return Math.max(0, completeness);
  }

  // ============================================
  // GENERATE WARNINGS
  // ============================================

  public generateWarnings(): MetricWarning[] {
    const warnings: MetricWarning[] = [];
    const checks = this.runConsistencyChecks();

    checks.checks
      .filter((c) => !c.passed)
      .forEach((c) => {
        warnings.push({
          type: c.affectedMetrics?.length ? "incomplete_data" : "low_confidence",
          message: c.message,
          severity: c.affectedMetrics && c.affectedMetrics.length > 3 ? "warning" : "info",
        });
      });

    return warnings;
  }
}
