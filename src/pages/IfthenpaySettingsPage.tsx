import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Copy, RotateCw, ExternalLink, Eye, EyeOff, ShieldCheck, AlertTriangle } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { toast } from "sonner";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useIfthenpaySettings, IFTHENPAY_METHODS, type IfthenpayMethod } from "@/hooks/integrations/useIfthenpaySettings";

export default function IfthenpaySettingsPage() {
  const { currentWorkspace } = useWorkspace();
  const {
    settings,
    isLoading,
    initSettings,
    updateSettings,
    rotateKey,
    callbackUrl,
    logs,
    logsLoading,
  } = useIfthenpaySettings();

  const [showKeys, setShowKeys] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});

  const { isSuperAdmin } = useUserRole();
  const isAdminLikely = isSuperAdmin || currentWorkspace?.role === "owner" || currentWorkspace?.role === "admin";

  function copy(value: string, label = "Copiado") {
    navigator.clipboard.writeText(value);
    toast.success(label);
  }

  function fieldValue(key: keyof typeof draft, fallback: string | null | undefined) {
    return draft[key] ?? fallback ?? "";
  }

  function setField(key: string, value: string) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function saveKeys() {
    if (Object.keys(draft).length === 0) return;
    // Normalizar tipos: expiry_days é integer, restantes campos vazios → null
    const patch: Record<string, any> = {};
    for (const [k, v] of Object.entries(draft)) {
      if (k === "expiry_days") {
        const n = parseInt(v, 10);
        patch[k] = Number.isFinite(n) && n > 0 ? n : 60;
      } else {
        const trimmed = (v ?? "").trim();
        patch[k] = trimmed === "" ? null : trimmed;
      }
    }
    updateSettings.mutate(patch, { onSuccess: () => setDraft({}) });
  }

  function toggleMethod(method: IfthenpayMethod, on: boolean) {
    if (!settings) return;
    const next = on
      ? Array.from(new Set([...(settings.enabled_methods ?? []), method]))
      : (settings.enabled_methods ?? []).filter((m) => m !== method);
    updateSettings.mutate({ enabled_methods: next });
  }

  if (!currentWorkspace) {
    return (
      <div className="p-6">
        <Alert>
          <AlertDescription>Seleciona um workspace para configurar a ifthenpay.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return <div className="p-6 text-muted-foreground">A carregar configuração…</div>;
  }

  // Empty state — no settings row yet
  if (!settings) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Integração ifthenpay</CardTitle>
            <CardDescription>
              Pagamentos Multibanco, MB WAY, Cartão e Payshop para o workspace{" "}
              <strong>{currentWorkspace.name}</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Ainda não existe configuração ifthenpay para este workspace. Clica abaixo para inicializar
              — vai ser gerada automaticamente uma <strong>anti-phishing key</strong> e o URL de callback
              que tens de enviar à ifthenpay.
            </p>
            <Button
              onClick={() => initSettings.mutate()}
              disabled={initSettings.isPending || !isAdminLikely}
            >
              Inicializar configuração
            </Button>
            {!isAdminLikely && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Só administradores ou owners do workspace podem configurar a ifthenpay.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Integração ifthenpay</h1>
          <p className="text-muted-foreground">
            Workspace <strong>{currentWorkspace.name}</strong> · slug <code>{currentWorkspace.slug}</code>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={settings.is_active ? "default" : "secondary"}>
            {settings.is_active ? "Ativo" : "Inativo"}
          </Badge>
          <Badge variant={settings.test_mode ? "outline" : "default"}>
            {settings.test_mode ? "Modo teste" : "Produção"}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="callback">
        <TabsList>
          <TabsTrigger value="callback">Callback URL</TabsTrigger>
          <TabsTrigger value="keys">Chaves</TabsTrigger>
          <TabsTrigger value="methods">Métodos</TabsTrigger>
          <TabsTrigger value="logs">Histórico</TabsTrigger>
        </TabsList>

        {/* CALLBACK URL TAB */}
        <TabsContent value="callback" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                URL de callback anti-phishing
              </CardTitle>
              <CardDescription>
                Envia este URL à equipa da ifthenpay. Eles vão chamar este endereço sempre que um
                pagamento for confirmado. A <code>key</code> protege contra falsificações.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">URL completo</Label>
                <div className="flex gap-2 mt-1">
                  <Input readOnly value={callbackUrl} className="font-mono text-xs" />
                  <Button variant="outline" size="icon" onClick={() => copy(callbackUrl, "URL copiado")}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Separator />

              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Anti-phishing key</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    readOnly
                    type={showKeys ? "text" : "password"}
                    value={settings.anti_phishing_key}
                    className="font-mono text-xs"
                  />
                  <Button variant="outline" size="icon" onClick={() => setShowKeys(!showKeys)}>
                    {showKeys ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copy(settings.anti_phishing_key, "Key copiada")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (confirm("Rodar a anti-phishing key invalida o URL antigo. Vais ter de enviar o novo URL à ifthenpay. Continuar?")) {
                        rotateKey.mutate();
                      }
                    }}
                    disabled={rotateKey.isPending}
                  >
                    <RotateCw className="h-4 w-4 mr-2" /> Rodar
                  </Button>
                </div>
              </div>

              <Alert>
                <AlertDescription className="text-sm">
                  <strong>Como configurar na ifthenpay:</strong> entra no backoffice → Conta → Callback,
                  e cola o URL completo acima no campo <em>URL anti-phishing</em>.
                </AlertDescription>
              </Alert>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <p className="font-medium">Ativar integração</p>
                  <p className="text-sm text-muted-foreground">
                    Quando ativa, os métodos selecionados ficam disponíveis no checkout.
                  </p>
                </div>
                <Switch
                  checked={settings.is_active}
                  onCheckedChange={(v) => updateSettings.mutate({ is_active: v })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Modo teste</p>
                  <p className="text-sm text-muted-foreground">
                    Usa as chaves de sandbox da ifthenpay (sem cobrança real).
                  </p>
                </div>
                <Switch
                  checked={settings.test_mode}
                  onCheckedChange={(v) => updateSettings.mutate({ test_mode: v })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* KEYS TAB */}
        <TabsContent value="keys" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Chaves por método</CardTitle>
              <CardDescription>
                Obtém estas chaves no <a href="https://backoffice.ifthenpay.com" target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1">backoffice ifthenpay <ExternalLink className="h-3 w-3" /></a>.
                Cada método tem a sua chave específica.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Multibanco — Entidade</Label>
                  <Input
                    value={fieldValue("mb_entidade", settings.mb_entidade)}
                    onChange={(e) => setField("mb_entidade", e.target.value)}
                    placeholder="ex.: 11604"
                  />
                </div>
                <div>
                  <Label>Multibanco — Subentidade</Label>
                  <Input
                    value={fieldValue("mb_subentidade", settings.mb_subentidade)}
                    onChange={(e) => setField("mb_subentidade", e.target.value)}
                    placeholder="ex.: 999"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Multibanco — Chave Backoffice (mbKey)</Label>
                  <Input
                    type={showKeys ? "text" : "password"}
                    value={fieldValue("mb_key", settings.mb_key)}
                    onChange={(e) => setField("mb_key", e.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>MB WAY Key</Label>
                  <Input
                    type={showKeys ? "text" : "password"}
                    value={fieldValue("mbway_key", settings.mbway_key)}
                    onChange={(e) => setField("mbway_key", e.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Cartão de Crédito — Gateway Key</Label>
                  <Input
                    type={showKeys ? "text" : "password"}
                    value={fieldValue("cc_key", settings.cc_key)}
                    onChange={(e) => setField("cc_key", e.target.value)}
                  />
                </div>
                <div>
                  <Label>Payshop Key (opcional)</Label>
                  <Input
                    type={showKeys ? "text" : "password"}
                    value={fieldValue("payshop_key", settings.payshop_key)}
                    onChange={(e) => setField("payshop_key", e.target.value)}
                  />
                </div>
                <div>
                  <Label>Pix Key (opcional)</Label>
                  <Input
                    type={showKeys ? "text" : "password"}
                    value={fieldValue("pix_key", settings.pix_key)}
                    onChange={(e) => setField("pix_key", e.target.value)}
                  />
                </div>
                <div>
                  <Label>Validade da referência MB (dias)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    value={fieldValue("expiry_days", String(settings.expiry_days))}
                    onChange={(e) => setField("expiry_days", e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button variant="ghost" size="sm" onClick={() => setShowKeys(!showKeys)}>
                  {showKeys ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                  {showKeys ? "Ocultar" : "Mostrar"} chaves
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setDraft({})} disabled={Object.keys(draft).length === 0}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={saveKeys}
                    disabled={Object.keys(draft).length === 0 || updateSettings.isPending}
                  >
                    Guardar alterações
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* METHODS TAB */}
        <TabsContent value="methods" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Métodos ativos no checkout</CardTitle>
              <CardDescription>Escolhe que métodos de pagamento ficam visíveis ao cliente.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {IFTHENPAY_METHODS.map((m) => {
                const enabled = (settings.enabled_methods ?? []).includes(m.id);
                return (
                  <div key={m.id} className="flex items-center justify-between border rounded-md p-3">
                    <div>
                      <p className="font-medium">{m.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {enabled ? "Visível no checkout" : "Oculto"}
                      </p>
                    </div>
                    <Switch
                      checked={enabled}
                      onCheckedChange={(v) => toggleMethod(m.id, v)}
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* LOGS TAB */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de callbacks</CardTitle>
              <CardDescription>
                Últimos 20 callbacks recebidos da ifthenpay. Útil para diagnosticar configuração.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <p className="text-muted-foreground text-sm">A carregar…</p>
              ) : logs.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Ainda não foram recebidos callbacks. Após enviar o URL à ifthenpay e fazer o primeiro pagamento, vai aparecer aqui.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Quando</TableHead>
                      <TableHead>Resultado</TableHead>
                      <TableHead>OrderId</TableHead>
                      <TableHead>IP</TableHead>
                      <TableHead>Erro</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs whitespace-nowrap">
                          {new Date(log.received_at).toLocaleString("pt-PT")}
                        </TableCell>
                        <TableCell>
                          <Badge variant={log.outcome === "accepted" ? "default" : log.outcome === "duplicate_ignored" ? "secondary" : "destructive"}>
                            {log.outcome}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {log.query_params?.orderId || log.query_params?.id || "—"}
                        </TableCell>
                        <TableCell className="text-xs">{log.request_ip ?? "—"}</TableCell>
                        <TableCell className="text-xs text-destructive">{log.error_message ?? ""}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
