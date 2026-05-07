import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck, AlertTriangle, ArrowRightLeft } from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ReportRow {
  conversation_id: string;
  ghl_conversation_id: string;
  channel: string;
  current_workspace: string;
  detected_account_id: string | null;
  correct_workspace: string | null;
  action: "kept" | "moved" | "no_owner" | "no_account_id" | "error";
  reason?: string;
}

interface CleanupResult {
  dry_run: boolean;
  source_workspace_id: string;
  location_id: string;
  total_inspected: number;
  moved: number;
  kept: number;
  skipped: number;
  report: ReportRow[];
}

export function GHLRoutingTab() {
  const { currentWorkspace } = useWorkspace();
  const [dryRun, setDryRun] = useState(true);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<CleanupResult | null>(null);

  const run = async () => {
    if (!currentWorkspace?.id) return;
    setRunning(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("ghl-cleanup-routing", {
        body: { source_workspace_id: currentWorkspace.id, dry_run: dryRun, limit: 500 },
      });
      if (error) throw error;
      setResult(data as CleanupResult);
      toast.success(
        dryRun
          ? `Diagnóstico concluído — ${(data as CleanupResult).report.filter(r => r.action === "moved").length} conversas a mover`
          : `Cleanup concluído — ${(data as CleanupResult).moved} conversas movidas`
      );
    } catch (err) {
      console.error(err);
      toast.error("Falha ao executar cleanup");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Isolamento de routing GHL (multi-workspace)
          </CardTitle>
          <CardDescription>
            Audita conversas GHL no workspace atual e identifica as que pertencem a outro workspace que partilha a
            mesma <code>location_id</code>. Em modo execução, move-as para o workspace correto (com mensagens e lead).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label>Modo dry-run (apenas relatório)</Label>
              <p className="text-xs text-muted-foreground">
                Desativa para mover efetivamente conversas, mensagens e leads.
              </p>
            </div>
            <Switch checked={dryRun} onCheckedChange={setDryRun} />
          </div>

          <Button onClick={run} disabled={running} className="w-full">
            {running ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> A executar…</>
            ) : (
              <><ArrowRightLeft className="mr-2 h-4 w-4" /> {dryRun ? "Diagnosticar" : "Executar cleanup"}</>
            )}
          </Button>

          {result && (
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-2">
                <Stat label="Inspecionadas" value={result.total_inspected} />
                <Stat label="Corretas" value={result.kept} variant="default" />
                <Stat label="A mover" value={result.report.filter(r => r.action === "moved").length} variant="warning" />
                <Stat label="Sem owner" value={result.skipped} variant="muted" />
              </div>

              {result.report.length > 0 && (
                <ScrollArea className="h-[400px] rounded-md border">
                  <div className="divide-y">
                    {result.report.map((row) => (
                      <div key={row.conversation_id} className="p-3 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="outline">{row.channel}</Badge>
                          <ActionBadge action={row.action} />
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                          <div>
                            <span className="font-medium">Conv GHL:</span> <code>{row.ghl_conversation_id}</code>
                          </div>
                          <div>
                            <span className="font-medium">Account ID:</span>{" "}
                            <code>{row.detected_account_id || "—"}</code>
                          </div>
                          <div className="col-span-2">
                            <span className="font-medium">Workspace correto:</span>{" "}
                            <code>{row.correct_workspace || "—"}</code>
                          </div>
                          {row.reason && (
                            <div className="col-span-2 text-amber-600">
                              {row.reason}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Como funciona o isolamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Quando vários workspaces partilham a mesma <code>location_id</code> do GHL (ex: PHARLISS, METODOPARE,
            Blecksen), as conversas têm de ser atribuídas pelo <code>account_id</code> da página social
            (Instagram/Facebook page id, número WhatsApp).
          </p>
          <p>
            <strong>Webhook (mensagens em tempo real):</strong> faz lookup determinístico por <code>account_id</code> com
            fail-closed.
          </p>
          <p>
            <strong>Sync batch (esta tab):</strong> faz <code>GET /conversations/&#123;id&#125;</code> ao GHL para obter o{" "}
            <code>account_id</code> real e ignorar conversas que pertencem a outro workspace.
          </p>
          <p>
            <strong>Constraint BD:</strong> índice único impede duplicação ativa do mesmo{" "}
            <code>(ghl_account_id, channel_type)</code>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, variant = "default" }: { label: string; value: number; variant?: "default" | "warning" | "muted" }) {
  const colour =
    variant === "warning" ? "text-amber-600" :
    variant === "muted" ? "text-muted-foreground" :
    "text-foreground";
  return (
    <div className="rounded-md border p-3 text-center">
      <div className={`text-2xl font-bold ${colour}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function ActionBadge({ action }: { action: ReportRow["action"] }) {
  const map: Record<ReportRow["action"], { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    moved: { label: "A mover", variant: "default" },
    kept: { label: "OK", variant: "secondary" },
    no_owner: { label: "Sem owner", variant: "destructive" },
    no_account_id: { label: "Sem account_id", variant: "outline" },
    error: { label: "Erro", variant: "destructive" },
  };
  const cfg = map[action];
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}
