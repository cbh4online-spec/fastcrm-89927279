import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { PhoneIncoming, PhoneOutgoing } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useCloudtalk } from "@/hooks/useCloudtalk";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const fmtDur = (s: number | null) => (s ? `${Math.floor(s / 60)}m ${s % 60}s` : "—");

/** Read-only mirror of the workspace's CloudTalk calls inside VoiceHub (management view). */
export function CloudtalkVoiceHubPanel() {
  const { currentWorkspace } = useWorkspace();
  const ws = currentWorkspace?.id;
  const { moduleActive, status } = useCloudtalk();
  const connected = !!status.data?.connected;
  const calls = useQuery({
    queryKey: ["cloudtalk-calls", ws ?? "none", "voicehub"],
    enabled: !!ws && moduleActive && connected,
    queryFn: async () => {
      const { data, error } = await supabase.from("cloudtalk_calls")
        .select("id, direction, status, agent_name, duration_seconds, started_at, external_number, summary, contact_id, lead_id")
        .eq("workspace_id", ws!).order("started_at", { ascending: false, nullsFirst: false }).limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CardTitle>Chamadas CloudTalk</CardTitle>
          <Badge variant={connected ? "default" : "secondary"}>{connected ? "Ligada" : moduleActive ? "Não ligada" : "Módulo inativo"}</Badge>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link to={moduleActive ? "/settings/integrations" : "/dashboard/marketplace"}>{moduleActive ? "Configurar" : "Ativar no Marketplace"}</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {!connected ? (
          <p className="text-sm text-muted-foreground">Ligue a CloudTalk para ver aqui todas as chamadas da equipa. Cada chamada fica também na ficha do cliente.</p>
        ) : calls.isLoading ? (
          <p className="text-sm text-muted-foreground">A carregar…</p>
        ) : calls.isError ? (
          <p className="text-sm text-destructive">Não foi possível carregar as chamadas.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead></TableHead><TableHead>Número</TableHead><TableHead>Agente</TableHead>
                <TableHead>Estado</TableHead><TableHead>Duração</TableHead><TableHead>Resumo</TableHead><TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {calls.data!.length === 0 && (
                <TableRow><TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">Sem chamadas registadas.</TableCell></TableRow>
              )}
              {calls.data!.map((c) => {
                const href = c.contact_id ? `/dashboard/contacts/${c.contact_id}` : c.lead_id ? `/dashboard/leads/${c.lead_id}` : null;
                return (
                  <TableRow key={c.id}>
                    <TableCell>{c.direction === "inbound"
                      ? <PhoneIncoming className="h-4 w-4 text-muted-foreground" aria-label="Recebida" />
                      : <PhoneOutgoing className="h-4 w-4 text-muted-foreground" aria-label="Efetuada" />}</TableCell>
                    <TableCell className="font-medium">
                      {href ? <Link to={href} className="text-primary hover:underline">{c.external_number || "Ver ficha"}</Link> : (c.external_number || "—")}
                      {!href && <div className="text-xs text-muted-foreground">Sem ficha associada</div>}
                    </TableCell>
                    <TableCell>{c.agent_name ?? "—"}</TableCell>
                    <TableCell><Badge variant="outline">{c.status ?? "—"}</Badge></TableCell>
                    <TableCell>{fmtDur(c.duration_seconds)}</TableCell>
                    <TableCell className="max-w-xs truncate text-xs text-muted-foreground">{c.summary ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.started_at ? new Date(c.started_at).toLocaleString("pt-PT", { timeZone: "Europe/Lisbon", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
