import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWhatsAppWebhookLogs, type WhatsAppWebhookLog } from "@/hooks/useWhatsAppProOps";
import { CheckCircle2, AlertCircle, Eye, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

export function WhatsAppWebhookLogsTable() {
  const [phone, setPhone] = useState("");
  const [eventType, setEventType] = useState<string>("");
  const [processed, setProcessed] = useState<"all" | "processed" | "errors">("all");
  const [provider, setProvider] = useState("");
  const [selected, setSelected] = useState<WhatsAppWebhookLog | null>(null);

  const { data: logs, isLoading, refetch } = useWhatsAppWebhookLogs({
    phone: phone || undefined,
    eventType: eventType || undefined,
    processed,
    provider: provider || undefined,
  });

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Logs de Webhook</h3>
        <Button size="sm" variant="ghost" onClick={() => refetch()} aria-label="Atualizar">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-2 md:grid-cols-4">
        <Input placeholder="Telefone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Input placeholder="Tipo de evento" value={eventType} onChange={(e) => setEventType(e.target.value)} />
        <Select value={provider || "all"} onValueChange={(v) => setProvider(v === "all" ? "" : v)}>
          <SelectTrigger><SelectValue placeholder="Provider" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os providers</SelectItem>
            <SelectItem value="zapi">Z-API</SelectItem>
            <SelectItem value="zapy">Zapy</SelectItem>
            <SelectItem value="mock">Mock</SelectItem>
          </SelectContent>
        </Select>
        <Select value={processed} onValueChange={(v) => setProcessed(v as never)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="processed">Processados</SelectItem>
            <SelectItem value="errors">Com erro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-md overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-2 font-medium">Data</th>
              <th className="text-left p-2 font-medium">Provider</th>
              <th className="text-left p-2 font-medium">Evento</th>
              <th className="text-left p-2 font-medium">Telefone</th>
              <th className="text-left p-2 font-medium">Estado</th>
              <th className="text-right p-2"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">A carregar…</td></tr>
            )}
            {!isLoading && (!logs || logs.length === 0) && (
              <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">Sem logs com estes filtros.</td></tr>
            )}
            {logs?.map((l) => (
              <tr key={l.id} className="border-t hover:bg-muted/30">
                <td className="p-2 whitespace-nowrap">
                  {formatDistanceToNow(new Date(l.created_at), { addSuffix: true, locale: pt })}
                </td>
                <td className="p-2"><Badge variant="outline" className="text-[10px]">{l.provider_name ?? "—"}</Badge></td>
                <td className="p-2 font-mono text-[11px]">{l.event_type ?? "—"}</td>
                <td className="p-2 font-mono">{l.phone ?? "—"}</td>
                <td className="p-2">
                  {l.error_message ? (
                    <Badge variant="destructive" className="text-[10px] gap-1"><AlertCircle className="h-3 w-3" />Erro</Badge>
                  ) : l.processed ? (
                    <Badge className="text-[10px] gap-1 bg-emerald-500"><CheckCircle2 className="h-3 w-3" />OK</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">Pendente</Badge>
                  )}
                </td>
                <td className="p-2 text-right">
                  <Button size="icon" variant="ghost" onClick={() => setSelected(l)} aria-label="Ver">
                    <Eye className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-[500px] sm:max-w-[600px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Detalhe do webhook</SheetTitle>
          </SheetHeader>
          {selected && (
            <div className="mt-4 space-y-3">
              <div className="text-xs space-y-1">
                <div><strong>Provider:</strong> {selected.provider_name ?? "—"}</div>
                <div><strong>Evento:</strong> {selected.event_type ?? "—"}</div>
                <div><strong>Telefone:</strong> {selected.phone ?? "—"}</div>
                <div><strong>Direção:</strong> {selected.direction}</div>
                <div><strong>Estado:</strong> {selected.processed ? "Processado" : "Pendente"}</div>
                {selected.error_message && (
                  <div className="text-destructive"><strong>Erro:</strong> {selected.error_message}</div>
                )}
              </div>
              <Tabs defaultValue="payload">
                <TabsList>
                  <TabsTrigger value="payload">Payload</TabsTrigger>
                  <TabsTrigger value="normalized">Normalizado</TabsTrigger>
                  <TabsTrigger value="headers">Headers</TabsTrigger>
                </TabsList>
                <TabsContent value="payload">
                  <pre className="bg-muted p-3 rounded text-[11px] overflow-x-auto max-h-[60vh]">
                    {JSON.stringify(selected.payload, null, 2)}
                  </pre>
                </TabsContent>
                <TabsContent value="normalized">
                  <pre className="bg-muted p-3 rounded text-[11px] overflow-x-auto max-h-[60vh]">
                    {selected.normalized_payload ? JSON.stringify(selected.normalized_payload, null, 2) : "—"}
                  </pre>
                </TabsContent>
                <TabsContent value="headers">
                  <pre className="bg-muted p-3 rounded text-[11px] overflow-x-auto max-h-[60vh]">
                    {JSON.stringify(selected.headers ?? {}, null, 2)}
                  </pre>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </Card>
  );
}
