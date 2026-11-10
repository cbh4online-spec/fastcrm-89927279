import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PhoneIncoming, PhoneOutgoing } from "lucide-react";
import { useCloudtalk, useCloudtalkCalls } from "@/hooks/useCloudtalk";

const fmtDur = (s: number | null) => (s == null ? "—" : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`);

export function CloudtalkCallHistory({ contactId, leadId }: { contactId?: string; leadId?: string }) {
  const { moduleActive } = useCloudtalk();
  const calls = useCloudtalkCalls({ contactId, leadId });
  if (!moduleActive) return null;
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Chamadas CloudTalk</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {calls.isLoading && <p className="text-xs text-muted-foreground">A carregar…</p>}
        {calls.isError && <p className="text-xs text-destructive">Não foi possível carregar as chamadas.</p>}
        {calls.data?.length === 0 && <p className="text-xs text-muted-foreground">Sem chamadas registadas.</p>}
        {calls.data?.map((c) => (
          <div key={c.id} className="space-y-1 border-b border-border pb-2 last:border-0">
            <div className="flex items-center gap-2 text-sm text-foreground">
              {c.direction === "inbound" ? <PhoneIncoming className="h-4 w-4 text-muted-foreground" aria-label="Recebida" /> : <PhoneOutgoing className="h-4 w-4 text-muted-foreground" aria-label="Efetuada" />}
              <span>{c.started_at ? new Date(c.started_at).toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" }) : "—"}</span>
              <span className="ml-auto text-xs text-muted-foreground">{fmtDur(c.duration_seconds)}</span>
            </div>
            <p className="text-xs text-muted-foreground">{[c.status, c.agent_name].filter(Boolean).join(" · ")}</p>
            {c.recording_url && /^https:\/\//.test(c.recording_url) && (
              <audio controls preload="none" src={c.recording_url} className="w-full h-8" aria-label="Gravação da chamada" />
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
