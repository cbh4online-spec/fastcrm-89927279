import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Copy, ShieldCheck, AlertTriangle, Link2 } from "lucide-react";
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

  const { settings, isLoading, logs, logsLoading, linkedCount, saveSettings, runPull, endpointUrl } =
    useMymiaCrmSync();

  const [outboundUrl, setOutboundUrl] = useState<string | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);

  const inbound = settings?.inbound_enabled ?? true;
  const outbound = settings?.outbound_enabled ?? false;
  const urlValue = outboundUrl ?? settings?.outbound_endpoint_url ?? "";
  const sourceValue = sourceUrl ?? settings?.source_url ?? "";
  const pullEnabled = settings?.pull_enabled ?? false;
  const pullConversations = settings?.pull_conversations ?? true;
  const lastSummary = settings?.last_pull_summary ?? null;
  const busy = runPull.isPending;

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
