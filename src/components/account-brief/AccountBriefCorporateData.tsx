import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Building2, Users, TrendingUp, Search, Calendar, Scale } from "lucide-react";
import { useAccountBriefCorporateData } from "@/hooks/useAccountBriefCorporateData";
import { cn } from "@/lib/utils";

interface AccountBriefCorporateDataProps {
  accountId: string;
  accountNif?: string | null;
}

function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}

export function AccountBriefCorporateData({ accountId, accountNif }: AccountBriefCorporateDataProps) {
  const { corporateData, isLoading, lookupCorporate } = useAccountBriefCorporateData(accountId);

  if (isLoading) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const hasCorporateData = corporateData && (
    corporateData.shareholders.length > 0 ||
    corporateData.managers.length > 0 ||
    corporateData.annual_revenue.length > 0
  );

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="flex-row items-center justify-between pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 className="w-4 h-4 text-indigo-500" /> Dados Corporativos
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => lookupCorporate.mutate({ nif: accountNif || undefined })}
          disabled={lookupCorporate.isPending}
        >
          {lookupCorporate.isPending ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Search className="w-3 h-3" />
          )}
          {hasCorporateData ? "Atualizar" : "Pesquisar"}
        </Button>
      </CardHeader>
      <CardContent>
        {!hasCorporateData ? (
          <div className="text-center py-6">
            <Building2 className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Sem dados corporativos. Clique em "Pesquisar" para extrair do registo público.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Meta info */}
            {(corporateData.capital_social || corporateData.legal_nature || corporateData.founding_date) && (
              <div className="flex flex-wrap gap-2">
                {corporateData.capital_social && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <Scale className="w-3 h-3" /> {corporateData.capital_social}
                  </Badge>
                )}
                {corporateData.legal_nature && (
                  <Badge variant="outline" className="text-xs">{corporateData.legal_nature}</Badge>
                )}
                {corporateData.founding_date && (
                  <Badge variant="outline" className="gap-1 text-xs">
                    <Calendar className="w-3 h-3" /> {corporateData.founding_date}
                  </Badge>
                )}
                {corporateData.company_status && (
                  <Badge
                    variant="outline"
                    className={cn("text-xs", corporateData.company_status.toLowerCase().includes("activ") && "border-emerald-500 text-emerald-600")}
                  >
                    {corporateData.company_status}
                  </Badge>
                )}
              </div>
            )}

            {/* Shareholders */}
            {corporateData.shareholders.length > 0 && (
              <div>
                <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                  <Users className="w-3.5 h-3.5 text-indigo-500" /> Sócios / Quotistas
                </h4>
                <div className="space-y-1.5">
                  {corporateData.shareholders.map((s, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-md bg-muted/30 text-sm">
                      <div className="flex items-center gap-2">
                        <span>{s.name}</span>
                        {s.type === "corporate" && (
                          <Badge variant="outline" className="text-[10px] h-4">Empresa</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-muted-foreground text-xs">
                        {s.quota_percent !== null && <span>{s.quota_percent}%</span>}
                        {s.quota_value && <span>{s.quota_value}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Managers */}
            {corporateData.managers.length > 0 && (
              <div>
                <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                  <Users className="w-3.5 h-3.5 text-indigo-500" /> Gerência / Administração
                </h4>
                <div className="space-y-1.5">
                  {corporateData.managers.map((m, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-md bg-muted/30 text-sm">
                      <span>{m.name}</span>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="secondary" className="text-[10px] h-4">{m.role}</Badge>
                        {m.start_date && <span>{m.start_date}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Annual Revenue */}
            {corporateData.annual_revenue.length > 0 && (
              <div>
                <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                  <TrendingUp className="w-3.5 h-3.5 text-indigo-500" /> Volume de Negócios
                </h4>
                <div className="space-y-1.5">
                  {corporateData.annual_revenue
                    .sort((a, b) => b.year - a.year)
                    .map((r, i) => {
                      const maxRevenue = Math.max(...corporateData!.annual_revenue.filter(x => x.revenue).map(x => x.revenue!));
                      const widthPercent = r.revenue && maxRevenue ? (r.revenue / maxRevenue) * 100 : 0;
                      return (
                        <div key={i} className="flex items-center gap-3 text-sm">
                          <span className="w-12 text-muted-foreground font-mono text-xs">{r.year}</span>
                          <div className="flex-1 h-6 bg-muted/30 rounded relative overflow-hidden">
                            <div
                              className="h-full bg-indigo-500/20 rounded"
                              style={{ width: `${Math.max(widthPercent, 5)}%` }}
                            />
                            <span className="absolute inset-0 flex items-center px-2 text-xs font-medium">
                              {r.revenue_formatted || formatCurrency(r.revenue)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Source */}
            {corporateData.extracted_at && (
              <p className="text-[10px] text-muted-foreground text-right">
                Extraído em {new Date(corporateData.extracted_at).toLocaleDateString("pt-PT")}
                {corporateData.source_url && (
                  <> · <a href={corporateData.source_url} target="_blank" rel="noopener noreferrer" className="hover:underline">Fonte</a></>
                )}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
