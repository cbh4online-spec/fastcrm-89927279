import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ModuleGuard } from "@/components/guards/ModuleGuard";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAccountBriefCompare } from "@/hooks/useAccountBriefCompare";
import { useAccountBriefAccounts } from "@/hooks/useAccountBriefAccounts";
import { GitCompareArrows, Loader2, Trophy, Shield, Zap, Sparkles, X, Search, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

const HIGHLIGHT_ICONS: Record<string, any> = {
  best_bet: { icon: Trophy, color: "text-amber-500", bg: "bg-amber-500/10", label: "Melhor Aposta" },
  most_mature: { icon: Shield, color: "text-blue-500", bg: "bg-blue-500/10", label: "Mais Madura" },
  highest_urgency: { icon: Zap, color: "text-red-500", bg: "bg-red-500/10", label: "Maior Urgência" },
  best_personalization: { icon: Sparkles, color: "text-purple-500", bg: "bg-purple-500/10", label: "Melhor Personalização" },
};

export default function AccountBriefComparePage() {
  const { accounts } = useAccountBriefAccounts();
  const { history, isLoadingHistory, compareAccounts, isComparing } = useAccountBriefCompare();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [activeRun, setActiveRun] = useState<any>(null);

  const filteredAccounts = accounts.filter(a =>
    !selectedIds.includes(a.id) &&
    (a.name.toLowerCase().includes(search.toLowerCase()) || a.domain.toLowerCase().includes(search.toLowerCase()))
  );

  const selectedAccounts = accounts.filter(a => selectedIds.includes(a.id));

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 5 ? [...prev, id] : prev
    );
  };

  const handleCompare = async () => {
    const result = await compareAccounts.mutateAsync(selectedIds);
    if (result?.run) setActiveRun(result.run);
  };

  const summary = activeRun?.summary_json as any;

  return (
    <ModuleGuard moduleSlug="account-brief" moduleName="Account Brief">
      <DashboardLayout>
        <div className="space-y-6">
          <PageHeader
            title="Comparar Contas"
            description="Compare 2 a 5 contas lado a lado com análise IA"
          />

          {/* Account selector */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-base">Selecionar contas ({selectedIds.length}/5)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedAccounts.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedAccounts.map(a => (
                    <Badge key={a.id} variant="secondary" className="gap-1.5 px-3 py-1.5 text-sm">
                      {a.name}
                      <button onClick={() => toggleSelect(a.id)}><X className="w-3 h-3" /></button>
                    </Badge>
                  ))}
                </div>
              )}

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Pesquisar contas..."
                  className="pl-10"
                />
              </div>

              {search && (
                <div className="max-h-48 overflow-y-auto border rounded-lg divide-y">
                  {filteredAccounts.slice(0, 10).map(a => (
                    <button
                      key={a.id}
                      onClick={() => toggleSelect(a.id)}
                      className="w-full flex items-center justify-between p-3 hover:bg-muted/50 text-left transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium">{a.name}</p>
                        <p className="text-xs text-muted-foreground">{a.domain}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{a.total_score}</Badge>
                        {selectedIds.includes(a.id) && <Check className="w-4 h-4 text-emerald-500" />}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <Button
                onClick={handleCompare}
                disabled={selectedIds.length < 2 || isComparing}
                className="gap-2"
              >
                {isComparing ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitCompareArrows className="w-4 h-4" />}
                Comparar {selectedIds.length} contas
              </Button>
            </CardContent>
          </Card>

          {/* Active comparison result */}
          {summary && (
            <div className="space-y-4">
              {/* Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(HIGHLIGHT_ICONS).map(([key, config]) => {
                  const data = summary[key];
                  if (!data) return null;
                  const Icon = config.icon;
                  return (
                    <Card key={key} className="border-0 shadow-lg">
                      <CardContent className="pt-5 pb-4">
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`p-2 rounded-lg ${config.bg} ${config.color}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-medium text-muted-foreground">{config.label}</span>
                        </div>
                        <p className="font-semibold text-sm">{data.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">{data.reason}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Executive summary */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-base">Sumário Executivo</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{summary.executive_summary}</p>
                  {summary.key_differences?.length > 0 && (
                    <div className="mt-4 space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground">Diferenças Chave:</p>
                      {summary.key_differences.map((d: string, i: number) => (
                        <p key={i} className="text-xs text-muted-foreground">• {d}</p>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Ranking */}
              {summary.ranking?.length > 0 && (
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-base">Ranking</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {summary.ranking.sort((a: any, b: any) => a.position - b.position).map((r: any) => (
                        <div key={r.name} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
                          <span className="text-2xl font-bold text-muted-foreground/50 w-8">#{r.position}</span>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{r.name}</p>
                            <p className="text-xs text-muted-foreground">{r.reasoning}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* History */}
          {history.length > 0 && !summary && (
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-base">Comparações Anteriores</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {history.map(run => (
                    <button
                      key={run.id}
                      onClick={() => setActiveRun(run)}
                      className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <GitCompareArrows className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{(run.account_ids as string[]).length} contas comparadas</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(run.created_at), "dd/MM/yyyy HH:mm")}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty state */}
          {!summary && history.length === 0 && !isLoadingHistory && (
            <Card className="border-0 shadow-lg">
              <CardContent className="py-16 text-center">
                <GitCompareArrows className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-lg font-medium mb-2">Sem comparações</p>
                <p className="text-sm text-muted-foreground">Selecione 2 a 5 contas acima para gerar uma análise comparativa com IA.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </DashboardLayout>
    </ModuleGuard>
  );
}
