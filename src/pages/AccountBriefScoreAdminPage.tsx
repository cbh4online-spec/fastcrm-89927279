import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ModuleGuard } from "@/components/guards/ModuleGuard";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Shield, CheckCircle2, Clock, Plus, Archive, AlertTriangle } from "lucide-react";
import { useAccountBriefScoreVersioning } from "@/hooks/useAccountBriefScoreVersioning";
import { useAccountBriefRetention, RETENTION_POLICY_LABELS } from "@/hooks/useAccountBriefRetention";
import { useAccountBriefErrorCatalog } from "@/hooks/useAccountBriefErrorCatalog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function AccountBriefScoreAdminPage() {
  const { versions, activeVersion, isLoading: svLoading, createVersion, activateVersion } = useAccountBriefScoreVersioning();
  const { policies, isLoading: retLoading, updatePolicy } = useAccountBriefRetention();
  const { catalog, isLoading: errLoading } = useAccountBriefErrorCatalog();

  const [newVersion, setNewVersion] = useState({ version_code: "", model_name: "gemini-scoring-v1" });
  const [showNewVersion, setShowNewVersion] = useState(false);

  const isLoading = svLoading || retLoading || errLoading;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <ModuleGuard moduleSlug="account-brief" moduleName="Account Brief">
      <DashboardLayout>
        <div className="space-y-6">
          <PageHeader
            title="Score, Retenção & Erros"
            description="Gestão do modelo de scoring, políticas de retenção e catálogo de erros"
          />

          <Tabs defaultValue="score" className="space-y-4">
            <TabsList>
              <TabsTrigger value="score">Modelo de Score</TabsTrigger>
              <TabsTrigger value="retention">Retenção</TabsTrigger>
              <TabsTrigger value="errors">Catálogo de Erros</TabsTrigger>
            </TabsList>

            {/* Score Versioning */}
            <TabsContent value="score" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium">Versões do Modelo</h3>
                  <p className="text-xs text-muted-foreground">Cada análise regista a versão do modelo utilizada</p>
                </div>
                <Dialog open={showNewVersion} onOpenChange={setShowNewVersion}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-1.5"><Plus className="w-3.5 h-3.5" /> Nova Versão</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Criar Versão do Modelo</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Código da versão</Label>
                        <Input placeholder="v2.1" value={newVersion.version_code} onChange={(e) => setNewVersion((p) => ({ ...p, version_code: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Nome do modelo</Label>
                        <Input value={newVersion.model_name} onChange={(e) => setNewVersion((p) => ({ ...p, model_name: e.target.value }))} />
                      </div>
                      <Button
                        className="w-full"
                        disabled={!newVersion.version_code || createVersion.isPending}
                        onClick={() => {
                          createVersion.mutate({
                            version_code: newVersion.version_code,
                            model_name: newVersion.model_name,
                            config_json: { weights: { maturity: 25, growth: 25, icp_fit: 25, personalization: 25 } },
                          });
                          setShowNewVersion(false);
                          setNewVersion({ version_code: "", model_name: "gemini-scoring-v1" });
                        }}
                      >
                        Criar e Ativar
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="space-y-3">
                {versions.length === 0 ? (
                  <Card className="border-0 shadow-lg">
                    <CardContent className="py-12 text-center text-muted-foreground text-sm">
                      <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      Nenhuma versão de score registada.
                    </CardContent>
                  </Card>
                ) : (
                  versions.map((v) => (
                    <Card key={v.id} className={`border-0 shadow-lg ${v.is_active ? "ring-1 ring-primary/30" : ""}`}>
                      <CardContent className="py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {v.is_active ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          ) : (
                            <Clock className="w-5 h-5 text-muted-foreground" />
                          )}
                          <div>
                            <p className="font-medium text-sm">{v.version_code}</p>
                            <p className="text-xs text-muted-foreground">{v.model_name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {v.is_active ? (
                            <Badge className="bg-emerald-500/20 text-emerald-600">Ativa</Badge>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => activateVersion.mutate(v.id)}
                              disabled={activateVersion.isPending}
                            >
                              Ativar
                            </Button>
                          )}
                          <Badge variant="outline" className="text-[10px]">
                            {v.activated_at ? new Date(v.activated_at).toLocaleDateString("pt-PT") : "—"}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            {/* Retention */}
            <TabsContent value="retention" className="space-y-4">
              <div>
                <h3 className="text-sm font-medium">Políticas de Retenção</h3>
                <p className="text-xs text-muted-foreground">Configure durante quanto tempo cada tipo de dados é mantido</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.entries(RETENTION_POLICY_LABELS).map(([key, label]) => {
                  const policy = policies.find((p) => p.policy_key === key);
                  return (
                    <Card key={key} className="border-0 shadow-lg">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Archive className="w-4 h-4 text-muted-foreground" />
                          {label}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Label className="text-xs whitespace-nowrap">Reter (dias)</Label>
                          <Input
                            type="number"
                            className="h-8 w-20"
                            defaultValue={policy?.retention_days ?? 90}
                            onBlur={(e) => {
                              const val = parseInt(e.target.value);
                              if (!isNaN(val) && val > 0) {
                                updatePolicy.mutate({
                                  policy_key: key,
                                  retention_days: val,
                                  archive_after_days: policy?.archive_after_days ?? undefined,
                                  purge_after_days: policy?.purge_after_days ?? undefined,
                                });
                              }
                            }}
                          />
                        </div>
                        {policy && (
                          <p className="text-[10px] text-muted-foreground">
                            Última atualização: {policy.updated_at ? new Date(policy.updated_at).toLocaleDateString("pt-PT") : "—"}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            {/* Error Catalog */}
            <TabsContent value="errors" className="space-y-4">
              <div>
                <h3 className="text-sm font-medium">Catálogo de Erros</h3>
                <p className="text-xs text-muted-foreground">Estados de exceção reconhecidos pelo sistema</p>
              </div>

              {catalog.length === 0 ? (
                <Card className="border-0 shadow-lg">
                  <CardContent className="py-12 text-center text-muted-foreground text-sm">
                    <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    Catálogo de erros vazio.
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {catalog.map((err) => (
                    <Card key={err.id} className="border-0 shadow-lg">
                      <CardContent className="py-3 flex items-start gap-3">
                        <Badge
                          variant="outline"
                          className={
                            err.severity === "critical"
                              ? "text-destructive border-destructive/30"
                              : err.severity === "high"
                              ? "text-orange-500 border-orange-300"
                              : err.severity === "medium"
                              ? "text-amber-500 border-amber-300"
                              : "text-muted-foreground"
                          }
                        >
                          {err.error_code}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{err.user_message}</p>
                          {err.suggested_action && (
                            <p className="text-xs text-muted-foreground mt-0.5">{err.suggested_action}</p>
                          )}
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline" className="text-[10px]">{err.error_type}</Badge>
                            <Badge variant="outline" className="text-[10px]">{err.severity}</Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>
    </ModuleGuard>
  );
}
