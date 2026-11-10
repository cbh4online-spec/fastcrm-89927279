import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Loader2 } from "lucide-react";
import { useCloudtalk } from "@/hooks/useCloudtalk";

export function CloudtalkConnectionCard() {
  const { moduleActive, status, agents, connect, disconnect, webhookInfo, saveAgent, setAutoAi } = useCloudtalk();
  const [keyId, setKeyId] = useState("");
  const [keySecret, setKeySecret] = useState("");
  const [agentId, setAgentId] = useState("");
  const [webhookUrl, setWebhookUrl] = useState<string | null>(null);

  if (!moduleActive) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <span>Ative o módulo «Telefonia CloudTalk» no Marketplace para ligar chamadas a partir do CRM.</span>
        <Button asChild size="sm" variant="outline"><Link to="/dashboard/marketplace">Abrir Marketplace</Link></Button>
      </div>
    );
  }
  if (status.isLoading) return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="A carregar" />;
  const s = status.data;

  const onConnect = async () => {
    try { await connect.mutateAsync({ apiKeyId: keyId, apiKeySecret: keySecret }); setKeySecret(""); toast.success("CloudTalk ligada"); }
    catch (e) { toast.error((e as Error).message); }
  };
  const onWebhook = async () => {
    try { const r = await webhookInfo.mutateAsync(); setWebhookUrl(r.url); }
    catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Badge variant={s?.connected ? "default" : "secondary"}>{s?.connected ? "Ligada" : "Não ligada"}</Badge>
        {s?.lastEventAt && <span className="text-xs text-muted-foreground">Última chamada recebida: {new Date(s.lastEventAt).toLocaleString("pt-PT")}</span>}
      </div>

      {!s?.connected ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5"><Label htmlFor="ct-key-id">Access Key ID</Label>
            <Input id="ct-key-id" value={keyId} onChange={(e) => setKeyId(e.target.value)} maxLength={200} autoComplete="off" /></div>
          <div className="space-y-1.5"><Label htmlFor="ct-key-secret">Access Key Secret</Label>
            <Input id="ct-key-secret" type="password" value={keySecret} onChange={(e) => setKeySecret(e.target.value)} maxLength={500} autoComplete="off" /></div>
          <p className="text-xs text-muted-foreground sm:col-span-2">Na CloudTalk: Conta → Configurações → API keys (plano Essential ou superior). Só gestores podem ligar.</p>
          <div className="sm:col-span-2">
            <Button onClick={onConnect} disabled={connect.isPending || keyId.length < 3 || keySecret.length < 3}>
              {connect.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Ligar CloudTalk
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={onWebhook} disabled={webhookInfo.isPending}>Ver endereço para registo de chamadas</Button>
            <Button variant="ghost" size="sm" onClick={() => disconnect.mutate()} disabled={disconnect.isPending}>Desligar</Button>
          </div>
          {s.manager && (
            <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
              <div>
                <Label htmlFor="ct-auto-ai" className="text-sm">Gerar resumos com IA automaticamente</Label>
                <p className="text-xs text-muted-foreground">Quando a CloudTalk enviar só a transcrição. Até 50 resumos por dia; consome créditos de IA.</p>
              </div>
              <Switch id="ct-auto-ai" checked={s.autoAi} disabled={setAutoAi.isPending}
                onCheckedChange={(v) => setAutoAi.mutate(v, { onError: (e) => toast.error((e as Error).message) })} />
            </div>
          )}
          {webhookUrl && (
            <div className="space-y-1.5">
              <div className="flex gap-2">
                <Input readOnly value={webhookUrl} aria-label="Endereço do webhook" className="font-mono text-xs" />
                <Button size="icon" variant="outline" aria-label="Copiar endereço"
                  onClick={() => { navigator.clipboard.writeText(webhookUrl); toast.success("Copiado"); }}><Copy className="h-4 w-4" /></Button>
              </div>
              <p className="text-xs text-muted-foreground">Na CloudTalk, crie uma automação (Workflow) com pedido HTTP POST para este endereço nos eventos de fim de chamada e gravação disponível. Mantenha-o privado.</p>
            </div>
          )}
        </div>
      )}

      <div className="space-y-1.5 border-t border-border pt-4">
        <Label htmlFor="ct-agent">O meu ID de agente CloudTalk</Label>
        <div className="flex gap-2">
          {agents.data && agents.data.length > 0 ? (
            <Select value={agentId || s?.agent?.agent_id || ""} onValueChange={setAgentId}>
              <SelectTrigger id="ct-agent"><SelectValue placeholder="Escolha o seu agente" /></SelectTrigger>
              <SelectContent>
                {agents.data.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}{a.email ? ` — ${a.email}` : ""} (ID {a.id})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input id="ct-agent" placeholder={s?.agent?.agent_id ?? "ex.: 123456"} value={agentId} onChange={(e) => setAgentId(e.target.value)} maxLength={40} />
          )}
          <Button variant="outline" disabled={!agentId.trim() || saveAgent.isPending}
            onClick={async () => { try { await saveAgent.mutateAsync(agentId); setAgentId(""); toast.success("ID de agente guardado"); } catch (e) { toast.error((e as Error).message); } }}>
            Guardar
          </Button>
        </div>
        {s?.agent?.agent_id && agents.data && !agents.data.some((a) => a.id === s.agent!.agent_id) && (
          <p className="text-xs text-destructive">O ID guardado ({s.agent.agent_id}) não existe na CloudTalk. Escolha o seu agente na lista e guarde.</p>
        )}
        <p className="text-xs text-muted-foreground">Necessário para «Ligar via CloudTalk»: a CloudTalk liga primeiro para si e depois para o cliente.</p>
      </div>
    </div>
  );
}
