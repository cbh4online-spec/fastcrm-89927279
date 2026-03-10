import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, ArrowRight, Phone, Mail, ExternalLink, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatters";
import { useTranslation } from "react-i18next";
import Papa from "papaparse";
import jsPDF from "jspdf";

interface PriorityDeal {
  id: string;
  title: string;
  value: number;
  status: string;
  probability: number | null;
  ai_next_action: string | null;
  last_activity_at: string | null;
  expected_close_date: string | null;
  days_inactive: number;
  risk_reason: string;
}

export function PriorityDealsTable() {
  const { t } = useTranslation("dashboard");
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;

  const { data: deals = [], isLoading } = useQuery({
    queryKey: ["priority-deals", wid],
    enabled: !!wid,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
    queryFn: async (): Promise<PriorityDeal[]> => {
      if (!wid) return [];
      const { data: opps } = await supabase
        .from("opportunities")
        .select("id, title, value, status, probability, ai_next_action, last_activity_at, expected_close_date, updated_at")
        .eq("workspace_id", wid)
        .in("status", ["open", "active", "negotiation"])
        .order("value", { ascending: false })
        .limit(50);

      if (!opps?.length) return [];
      const avgValue = opps.reduce((s, o: any) => s + (o.value || 0), 0) / opps.length;
      const now = Date.now();
      const result: PriorityDeal[] = [];

      for (const opp of opps as any[]) {
        const lastActivity = opp.last_activity_at || opp.updated_at;
        const daysInactive = lastActivity ? Math.floor((now - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24)) : 999;
        const isHighValue = (opp.value || 0) > avgValue;
        const isHighProb = (opp.probability || 0) >= 70;
        const isStalled = daysInactive > 5;
        const hasNoCloseDate = !opp.expected_close_date;

        if (!isHighValue && !isHighProb && !isStalled) continue;

        let risk_reason = "";
        if (isStalled) risk_reason = t("daysInactive", { days: daysInactive });
        else if (hasNoCloseDate) risk_reason = t("noCloseDate");
        else if (isHighProb) risk_reason = t("hotDealClose");
        else if (isHighValue) risk_reason = t("highValueFocus");

        result.push({
          id: opp.id, title: opp.title, value: opp.value || 0, status: opp.status,
          probability: opp.probability, ai_next_action: opp.ai_next_action,
          last_activity_at: lastActivity, expected_close_date: opp.expected_close_date,
          days_inactive: daysInactive, risk_reason,
        });
      }

      result.sort((a, b) => {
        if (a.days_inactive > 5 && b.days_inactive <= 5) return -1;
        if (b.days_inactive > 5 && a.days_inactive <= 5) return 1;
        return b.value - a.value;
      });
      return result.slice(0, 8);
    },
  });

  function exportCsv() {
    const csv = Papa.unparse(deals.map(d => ({
      [t("priorityDeals")]: d.title,
      [t("revenue")]: d.value,
      Status: d.status,
      [t("mainRiskTitle")]: d.risk_reason,
    })));
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "priority-deals.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  function exportPdf() {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(t("priorityDeals"), 14, 20);
    doc.setFontSize(10);
    deals.forEach((d, i) => {
      const y = 30 + i * 12;
      doc.text(`${d.title} — ${formatCurrency(d.value)} — ${d.risk_reason}`, 14, y);
    });
    doc.save("priority-deals.pdf");
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Star className="h-4 w-4 text-warning" /> {t("priorityDeals")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  if (deals.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Star className="h-4 w-4 text-warning" /> {t("priorityDeals")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center py-4 text-center">
            <p className="text-sm font-medium text-foreground mb-1">{t("noPriorityDeals")}</p>
            <p className="text-xs text-muted-foreground max-w-xs">{t("noPriorityDealsHint")}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Star className="h-4 w-4 text-warning" /> {t("priorityDeals")}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] gap-1" onClick={exportCsv}>
              <Download className="h-3 w-3" /> {t("exportCsv")}
            </Button>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] gap-1" onClick={exportPdf}>
              <Download className="h-3 w-3" /> {t("exportPdf")}
            </Button>
            <Badge variant="secondary" className="text-[10px]">{deals.length}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {deals.map((deal) => {
            const isStalled = deal.days_inactive > 5;
            const isHot = (deal.probability || 0) >= 70;
            return (
              <div key={deal.id} className="flex items-center justify-between py-2 px-2 rounded-md hover:bg-muted/50 transition-colors group">
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <div className={cn("w-1.5 h-1.5 rounded-full shrink-0 mt-1.5", isStalled ? "bg-destructive" : isHot ? "bg-success" : "bg-warning")} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{deal.title}</p>
                      <span className="text-xs font-semibold text-foreground shrink-0">{formatCurrency(deal.value)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={cn("text-[10px]", isStalled ? "text-destructive" : "text-muted-foreground")}>{deal.risk_reason}</span>
                      {deal.ai_next_action && <span className="text-[10px] text-primary truncate">→ {deal.ai_next_action}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => navigate(`/dashboard/opportunities/${deal.id}`)} title={t("openDeal")}>
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => navigate(`/dashboard/opportunities/${deal.id}`)} title={t("callActionTitle")}>
                    <Phone className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => navigate(`/dashboard/inbox`)} title={t("followUpActionTitle")}>
                    <Mail className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
