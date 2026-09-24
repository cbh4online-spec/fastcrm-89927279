import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Copy, ShieldCheck, AlertTriangle, Link2, RefreshCw, Download } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { toast } from "sonner";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useMymiaCrmSync } from "@/hooks/integrations/useMymiaCrmSync";

export default function MymiaCrmSyncPage() {
  const { currentWorkspace } = useWorkspace();
  const { isSuperAdmin } = useUserRole();
  const canManage =
    isSuperAdmin || currentWorkspace?.role === "owner" || currentWorkspace?.role === "admin";

  const {
    settings,
    isLoading,
    logs,
    logsLoading,
    linkedCount,
    stateCounts,
    runs,
    runsLoading,
    saveSettings,
    runPull,
    endpointUrl,
  } = useMymiaCrmSync();

  const [outboundUrl, setOutboundUrl] = useState<string | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);

  const inbound = settings?.inbound_enabled ?? true;
  const outbound = settings?.outbound_enabled ?? false;
  const urlValue = outboundUrl ?? settings?.outbound_endpoint_url ?? "";
  const sourceValue = sourceUrl ?? settings?.source_url ?? "";
  const pullEnabled = settings?.pull_enabled ?? false;
  const pullConversations = settings?.pull_conversations ?? true;
  const autoSync = settings?.auto_sync_enabled ?? false;
  const lastSummary = settings?.last_pull_summary ?? null;
  const busy = runPull.isPending;

  const RUN_STATUS_LABEL: Record<string, string> = {
    concluido: "Concluída",
    running: "A correr",
    aguarda_origem: "O mymia.world não respondeu",
    aguarda_configuracao: "Falta configuração",
  };

  function copy(value: string) {
    navigator.clipboard.writeText(value);
    toast.success("Copiado");
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Ligação ao CRM do mymia.world</h1>
            <p className="text-muted-foreground">
              Recebe os contactos do mymia.world neste espaço de trabalho e mantém-nos ligados.
            </p>
          </div>
          <Badge variant="secondary" className="gap-1">
            <Link2 className="h-3.5 w-3.5" />
            {linkedCount} contactos ligados
          </Badge>
        </div>

        {!canManage && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Só um responsável do espaço de trabalho pode alterar esta ligação.
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Estado da sincronização</CardTitle>
            <CardDescription>
              O que já está sincronizado e o que ainda precisa de atenção.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Sincronizados", value: stateCounts?.sincronizado ?? 0 },
                { label: "Com atualizações por trazer", value: stateCounts?.desatualizado ?? 0 },
                { label: "Com erro", value: stateCounts?.com_erro ?? 0 },
                { label: "Por confirmar", value: stateCounts?.por_confirmar ?? 0 },
              ].map((kpi) => (
                <div key={kpi.label} className="rounded-2xl border bg-card p-4">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    {kpi.label}
                  </p>
                  <p className="mt-1 text-2xl font-bold">{kpi.value}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <Label>Manter atualizado automaticamente</Label>
                <p className="text-sm text-muted-foreground">
                  De hora em hora, o sistema traz o que falta e verifica se há novidades. Não é
                  preciso carregar em nada.
                </p>
              </div>
              <Switch
                checked={autoSync}
                disabled={!canManage || isLoading || saveSettings.isPending || !sourceValue}
                onCheckedChange={(v) => saveSettings.mutate({ auto_sync_enabled: v })}
              />
            </div>

            {settings?.last_auto_run_at && (
              <p className="text-sm text-muted-foreground">
                Última verificação automática:{" "}
                {new Date(settings.last_auto_run_at).toLocaleString("pt-PT")} —{" "}
                {RUN_STATUS_LABEL[settings.last_auto_run_status ?? ""] ??
                  settings.last_auto_run_status}
              </p>
            )}

            <div>
              <h3 className="mb-2 text-sm font-semibold">Últimas verificações</h3>
              {runsLoading ? (
                <p className="text-sm text-muted-foreground">A carregar…</p>
              ) : runs.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Ainda não houve verificações automáticas.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Início</TableHead>
                      <TableHead>Resultado</TableHead>
                      <TableHead>Novos</TableHead>
                      <TableHead>Atualizados</TableHead>
                      <TableHead>Detalhe</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {runs.map((run) => (
                      <TableRow key={run.id}>
                        <TableCell className="whitespace-nowrap text-sm">
                          {new Date(run.started_at).toLocaleString("pt-PT")}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              run.status === "concluido"
                                ? "secondary"
                                : run.status === "running"
                                  ? "outline"
                                  : "destructive"
                            }
                          >
                            {RUN_STATUS_LABEL[run.status] ?? run.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{run.summary?.created ?? 0}</TableCell>
                        <TableCell>{run.summary?.updated ?? 0}</TableCell>
                        <TableCell className="max-w-[280px] truncate text-xs text-muted-foreground">
                          {run.error ?? run.reason ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </CardContent>
        </Card>


        <Card>
          <CardHeader>
            <CardTitle>Trazer contactos e conversas do mymia.world</CardTitle>
            <CardDescription>
              Indique o endereço do mymia.world, ligue a opção e carregue no botão. Traz os
              contactos, o histórico de notas e as conversas de WhatsApp de cada um.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="source-url">Endereço do mymia.world</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="source-url"
                  placeholder="https://..."
                  value={sourceValue}
                  disabled={!canManage}
                  onChange={(e) => setSourceUrl(e.target.value)}
                />
                <Button
                  variant="outline"
                  disabled={!canManage || saveSettings.isPending || sourceUrl === null}
                  onClick={() =>
                    saveSettings.mutate(
                      { source_url: (sourceUrl ?? "").trim() || null },
                      { onSuccess: () => setSourceUrl(null) },
                    )
                  }
                >
                  Guardar
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <Label>Trazer dados do mymia.world</Label>
                <p className="text-sm text-muted-foreground">
                  Enquanto estiver desligado, nada é importado.
                </p>
              </div>
              <Switch
                checked={pullEnabled}
                disabled={!canManage || isLoading || saveSettings.isPending || !sourceValue}
                onCheckedChange={(v) => saveSettings.mutate({ pull_enabled: v })}
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <Label>Incluir conversas de WhatsApp</Label>
                <p className="text-sm text-muted-foreground">
                  Copia o histórico de mensagens de cada contacto para a caixa de entrada.
                </p>
              </div>
              <Switch
                checked={pullConversations}
                disabled={!canManage || isLoading || saveSettings.isPending}
                onCheckedChange={(v) => saveSettings.mutate({ pull_conversations: v })}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                disabled={!canManage || busy || !sourceValue}
                onClick={() => runPull.mutate({ mode: "preview" })}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${busy ? "animate-spin" : ""}`} />
                Ver o que existe
              </Button>
              <Button
                disabled={!canManage || busy || !pullEnabled}
                onClick={() => runPull.mutate({ mode: "apply", limit: 200 })}
              >
                <Download className="mr-2 h-4 w-4" />
                Sincronizar contactos e conversas agora
              </Button>
            </div>

            {settings?.last_pull_at && (
              <p className="text-sm text-muted-foreground">
                Última sincronização: {new Date(settings.last_pull_at).toLocaleString("pt-PT")}
                {lastSummary
                  ? ` — ${lastSummary.created ?? 0} novos, ${lastSummary.updated ?? 0} atualizados, ${lastSummary.conversations ?? 0} conversas, ${lastSummary.messages ?? 0} mensagens`
                  : ""}
              </p>
            )}

            <Alert>
              <ShieldCheck className="h-4 w-4" />
              <AlertDescription>
                A chave de acesso do mymia.world fica guardada em segurança e nunca aparece nesta
                página. Se faltar, avisamos ao sincronizar.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Endereço de receção</CardTitle>
            <CardDescription>
              Use este endereço no mymia.world para enviar os contactos. Cada envio tem de vir
              assinado com a chave partilhada.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Input readOnly value={endpointUrl} className="font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={() => copy(endpointUrl)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Alert>
              <ShieldCheck className="h-4 w-4" />
              <AlertDescription>
                Pedidos sem assinatura válida são recusados. A chave partilhada fica guardada em
                segurança e nunca aparece nesta página.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sentido da ligação</CardTitle>
            <CardDescription>Escolha o que entra e o que sai.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label>Receber contactos do mymia.world</Label>
                <p className="text-sm text-muted-foreground">
                  Cria ou atualiza o contacto correspondente neste espaço de trabalho.
                </p>
              </div>
              <Switch
                checked={inbound}
                disabled={!canManage || isLoading || saveSettings.isPending}
                onCheckedChange={(v) => saveSettings.mutate({ inbound_enabled: v })}
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <Label>Devolver alterações ao mymia.world</Label>
                <p className="text-sm text-muted-foreground">
                  Precisa de um endereço de receção do lado do mymia.world.
                </p>
              </div>
              <Switch
                checked={outbound}
                disabled={!canManage || isLoading || saveSettings.isPending || !urlValue}
                onCheckedChange={(v) => saveSettings.mutate({ outbound_enabled: v })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="outbound-url">Endereço do mymia.world</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="outbound-url"
                  placeholder="https://..."
                  value={urlValue}
                  disabled={!canManage}
                  onChange={(e) => setOutboundUrl(e.target.value)}
                />
                <Button
                  variant="outline"
                  disabled={!canManage || saveSettings.isPending || outboundUrl === null}
                  onClick={() =>
                    saveSettings.mutate(
                      { outbound_endpoint_url: (outboundUrl ?? "").trim() || null },
                      { onSuccess: () => setOutboundUrl(null) },
                    )
                  }
                >
                  Guardar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Últimos movimentos</CardTitle>
            <CardDescription>Registo das 50 operações mais recentes.</CardDescription>
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <p className="text-sm text-muted-foreground">A carregar…</p>
            ) : logs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Ainda não houve movimentos nesta ligação.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Sentido</TableHead>
                    <TableHead>Operação</TableHead>
                    <TableHead>Resultado</TableHead>
                    <TableHead>Detalhe</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {new Date(log.created_at).toLocaleString("pt-PT")}
                      </TableCell>
                      <TableCell>{log.direction === "inbound" ? "Entrada" : "Saída"}</TableCell>
                      <TableCell className="font-mono text-xs">{log.action}</TableCell>
                      <TableCell>
                        <Badge variant={log.status === "error" ? "destructive" : "secondary"}>
                          {log.status === "ok"
                            ? "Concluído"
                            : log.status === "skipped"
                              ? "Ignorado"
                              : "Erro"}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[320px] truncate text-xs text-muted-foreground">
                        {log.error ?? JSON.stringify(log.details ?? {})}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
