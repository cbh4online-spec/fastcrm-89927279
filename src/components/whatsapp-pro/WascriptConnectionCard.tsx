import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, Loader2, RefreshCw, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { useWascript } from "@/hooks/useWascript";

const fmt = (d: string | null) => (d ? new Date(d).toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" }) : "—");

export function WascriptConnectionCard() {
  const { status, mutate } = useWascript();
  const [token, setToken] = useState("");
  const s = status.data;
  const busy = mutate.isPending;

  const run = (action: Parameters<typeof mutate.mutate>[0]["action"], extra?: Record<string, unknown>, okMsg?: string) =>
    mutate.mutate({ action, extra }, {
      onSuccess: (d) => {
        if (d.warning) toast.warning(d.warning);
        else if (action === "test") (d.ok ? toast.success("Ligação a funcionar.") : toast.error(d.message ?? "Falhou o teste."));
        else if (okMsg) toast.success(okMsg);
        if (action === "save") setToken("");
      },
      onError: (e) => toast.error((e as Error).message),
    });

  const badge = !s || s.status === "disconnected"
    ? <Badge variant="secondary">Não ligada</Badge>
    : s.status === "error" ? <Badge variant="destructive">Com erro</Badge> : <Badge>Ligada</Badge>;

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2"><MessageSquare className="h-4 w-4" /> WAScript (WhatsApp Web)</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Envie a partir do FastCRM e receba as respostas na Caixa de Entrada.</p>
        </div>
        {badge}
      </div>

      {status.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status"><Loader2 className="h-4 w-4 animate-spin" /> A carregar…</div>
      ) : status.isError ? (
        <Alert variant="destructive"><AlertDescription className="text-xs">{(status.error as Error).message}</AlertDescription></Alert>
      ) : (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="wascript-token" className="text-xs">{s?.connected ? "Substituir token da WAScript" : "Token da WAScript"}</Label>
            <div className="flex gap-2">
              <Input id="wascript-token" type="password" autoComplete="off" value={token} maxLength={300}
                placeholder="Cole aqui o token da API" onChange={(e) => setToken(e.target.value)} />
              <Button disabled={busy || token.trim().length < 8} onClick={() => run("save", { apiToken: token.trim() }, "WAScript ligada.")}>
                {busy && mutate.variables?.action === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">O token fica guardado de forma segura e nunca volta a ser mostrado.</p>
          </div>

          {s?.connected && (
            <>
              {s.webhookUrl && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Endereço para receber mensagens</Label>
                  <div className="flex gap-2">
                    <Input value={s.webhookUrl} readOnly className="font-mono text-xs" aria-label="Endereço do webhook" />
                    <Button size="icon" variant="outline" aria-label="Copiar endereço"
                      onClick={() => { navigator.clipboard.writeText(s.webhookUrl!); toast.success("Endereço copiado"); }}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="outline" aria-label="Gerar novo endereço" disabled={busy}
                      onClick={() => { if (confirm("O endereço atual deixa de funcionar. Continuar?")) run("rotate_webhook", undefined, "Novo endereço gerado. Atualize-o na WAScript."); }}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Na WAScript abra WebHooks → <strong>Mensagens</strong>, cole este endereço em «URL do WebHook», ligue «Ativo» e guarde.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">Enviar mensagens pela WAScript</p>
                  <p className="text-[11px] text-muted-foreground">Quando ligado, o FastCRM envia por aqui em vez do fornecedor atual.</p>
                </div>
                <Switch checked={s.isPrimary} disabled={busy} aria-label="Enviar mensagens pela WAScript"
                  onCheckedChange={(v) => run("set_primary", { primary: v }, v ? "Envios passam pela WAScript." : "Envios voltaram ao fornecedor anterior.")} />
              </div>

              {s.lastError && <Alert variant="destructive"><AlertDescription className="text-xs">{s.lastError}</AlertDescription></Alert>}

              <div className="grid gap-2 sm:grid-cols-2 text-xs">
                <div className="rounded-md border px-3 py-2"><div className="text-[10px] uppercase text-muted-foreground">Última verificação</div>{fmt(s.lastCheckedAt)}</div>
                <div className="rounded-md border px-3 py-2"><div className="text-[10px] uppercase text-muted-foreground">Última mensagem recebida</div>{fmt(s.lastInboundAt)}</div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" disabled={busy} onClick={() => run("test")}>Testar ligação</Button>
                <Button size="sm" variant="ghost" disabled={busy}
                  onClick={() => { if (confirm("Desligar a WAScript desta organização?")) run("disconnect", undefined, "WAScript desligada."); }}>
                  Desligar
                </Button>
              </div>
            </>
          )}
        </>
      )}
    </Card>
  );
}
