import { useIntelligencePanel } from "@/hooks/useIntelligencePanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2, ArrowRight, Info, ExternalLink, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatters";
import { useTranslation } from "react-i18next";
import Papa from "papaparse";
import jsPDF from "jspdf";

const severityDot = (severity: string) =>
  severity === "HIGH" ? "bg-destructive" : severity === "MEDIUM" ? "bg-warning" : "bg-muted-foreground";

export function DealsAtRiskList() {
  const { t } = useTranslation('dashboard');
  const { data, isLoading } = useIntelligencePanel();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const risks = data?.top_risks?.slice(0, 5) || [];
  const actions = data?.recommended_actions || [];
  const healthScore = Math.round(data?.avg_health_score ?? 100);
  const noRisksButLowHealth = risks.length === 0 && healthScore < 70;

  const actionMap: Record<string, string> = {};
  actions.forEach((a) => { actionMap[a.deal_id] = a.action; });

  function exportCsv() {
    const csv = Papa.unparse(risks.map(r => ({
      Deal: r.deal_title,
      [t("mainRiskTitle")]: r.reason,
      Severity: r.severity,
      [t("healthScore")]: r.health_score,
    })));
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "deals-at-risk.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  function exportPdf() {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(t("dealsAtRisk"), 14, 20);
    doc.setFontSize(10);
    risks.forEach((r, i) => {
      const y = 30 + i * 12;
      doc.text(`${r.deal_title} — ${r.reason} (${r.severity})`, 14, y);
    });
    doc.save("deals-at-risk.pdf");
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            {t('dealsAtRisk')}
            {risks.length > 0 && (
              <Badge variant="destructive" className="text-[10px] ml-1">{risks.length}</Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-1">
            {risks.length > 0 && (
              <>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] gap-1" onClick={exportCsv}>
                  <Download className="h-3 w-3" /> {t("exportCsv")}
                </Button>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] gap-1" onClick={exportPdf}>
                  <Download className="h-3 w-3" /> {t("exportPdf")}
                </Button>
              </>
            )}
            {risks.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] text-muted-foreground hover:text-foreground gap-1"
                onClick={() => navigate("/dashboard/opportunities")}
              >
                {t('viewAll')} <ExternalLink className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {risks.length === 0 && !noRisksButLowHealth ? (
          <div className="flex flex-col items-center py-4 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10 mb-2">
              <AlertTriangle className="h-5 w-5 text-success" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">{t('noDealsAtRisk')}</p>
            <p className="text-xs text-muted-foreground max-w-xs">{t('noDealsAtRiskHint')}</p>
          </div>
        ) : risks.length === 0 && noRisksButLowHealth ? (
          <div className="flex items-start gap-2 py-3 px-2 rounded-lg bg-warning/10 border border-warning/20">
            <Info className="h-4 w-4 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-warning">{t('pipelineHealthAt', { score: healthScore })}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('noIndividualDealsButLowHealth')}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {risks.map((risk) => {
              const action = actionMap[risk.deal_id];
              return (
                <button
                  key={risk.deal_id}
                  className="w-full flex items-start justify-between py-2.5 px-2 rounded-md hover:bg-muted/50 transition-colors text-left group"
                  onClick={() => navigate(`/dashboard/opportunities/${risk.deal_id}`)}
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className={cn("w-1.5 h-1.5 rounded-full shrink-0 mt-1.5", severityDot(risk.severity))} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{risk.deal_title}</p>
                      <p className="text-xs text-muted-foreground truncate">{risk.reason}</p>
                      {action && (
                        <p className="text-[11px] text-primary mt-0.5 truncate">→ {action}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <Badge variant="outline" className="text-[10px] font-semibold">
                      {risk.health_score}
                    </Badge>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
