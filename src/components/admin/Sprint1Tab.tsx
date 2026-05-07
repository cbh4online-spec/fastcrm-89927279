import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldCheck, ShieldAlert, ShieldX, Phone, Globe, FileText, GraduationCap, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

interface SmokeRun {
  id: string;
  suite: string;
  status: string;
  summary: string | null;
  steps: Array<{ name: string; status: string; detail?: unknown; duration_ms?: number }>;
  duration_ms: number | null;
  created_at: string;
}

interface SecurityEvent {
  id: string;
  provider: string;
  function_name: string;
  validation_mode: string;
  outcome: string;
  reason: string | null;
  remote_ip: string | null;
  duration_ms: number | null;
  created_at: string;
}

const SUITE_META: Record<string, { label: string; icon: typeof Phone }> = {
  voicehub: { label: "VoiceHub", icon: Phone },
  customer_portal: { label: "Customer Portal", icon: Globe },
  proposal_portal: { label: "Proposal Portal", icon: FileText },
  onboarding_portal: { label: "Onboarding Portal", icon: GraduationCap },
};

function statusBadge(status: string) {
  if (status === "pass" || status === "valid")
    return <Badge variant="default" className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30">{status}</Badge>;
  if (status === "warn" || status === "skipped" || status === "missing_secret")
    return <Badge variant="outline" className="text-amber-700 border-amber-500/40">{status}</Badge>;
  return <Badge variant="destructive">{status}</Badge>;
}

export function Sprint1Tab() {
  const { currentWorkspace } = useWorkspace();
  const [running, setRunning] = useState<string | null>(null);
  const [runs, setRuns] = useState<SmokeRun[]>([]);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const [{ data: r }, { data: e }] = await Promise.all([
      supabase.from("sprint_smoke_runs").select("*").order("created_at", { ascending: false }).limit(40),
      supabase.from("webhook_security_events").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    setRuns((r ?? []) as never);
    setEvents((e ?? []) as never);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function runVoicehub() {
    if (!currentWorkspace?.id) return toast.error("Sem workspace ativo");
    setRunning("voicehub");
    const { data, error } = await supabase.functions.invoke("voicehub-smoke-test", {
      body: { workspace_id: currentWorkspace.id },
    });
    setRunning(null);
    if (error) toast.error("Falhou: " + error.message);
    else toast.success(`VoiceHub: ${data?.status ?? "ok"}`);
    load();
  }

  async function runPortals(suites?: string[]) {
    if (!currentWorkspace?.id) return toast.error("Sem workspace ativo");
    setRunning(suites?.[0] ?? "portals");
    const { data, error } = await supabase.functions.invoke("portals-smoke-test", {
      body: { workspace_id: currentWorkspace.id, suites },
    });
    setRunning(null);
    if (error) toast.error("Falhou: " + error.message);
    else toast.success("Portais: smoke test concluído");
    load();
  }

  const lastBySuite = new Map<string, SmokeRun>();
  for (const r of runs) if (!lastBySuite.has(r.suite)) lastBySuite.set(r.suite, r);

  const secStats = {
    valid: events.filter((e) => e.outcome === "valid").length,
    invalid: events.filter((e) => e.outcome === "invalid" || e.outcome === "missing_secret").length,
    skipped: events.filter((e) => e.outcome === "skipped").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-semibold">Sprint 1 — Consolidação</h3>
          <p className="text-sm text-muted-foreground">HMAC WhatsApp + VoiceHub E2E + smoke dos portais</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {/* Smoke tests cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {(["voicehub", "customer_portal", "proposal_portal", "onboarding_portal"] as const).map((suite) => {
          const meta = SUITE_META[suite];
          const Icon = meta.icon;
          const last = lastBySuite.get(suite);
          const isRunning = running === suite || (suite !== "voicehub" && running === "portals");
          return (
            <Card key={suite}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2"><Icon className="h-4 w-4" />{meta.label}</CardTitle>
                  {last && statusBadge(last.status)}
                </div>
                <CardDescription className="text-xs">
                  {last ? `Última: ${new Date(last.created_at).toLocaleString("pt-PT")}` : "Nunca executado"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {last?.summary && <p className="text-xs text-muted-foreground">{last.summary}</p>}
                <Button
                  size="sm" className="w-full" disabled={isRunning || !currentWorkspace?.id}
                  onClick={() => suite === "voicehub" ? runVoicehub() : runPortals([suite])}
                >
                  {isRunning ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : null}
                  Correr smoke test
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Button
        variant="secondary" disabled={!!running || !currentWorkspace?.id}
        onClick={() => runPortals()}
      >
        Correr todos os portais
      </Button>

      {/* Webhook security events */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" /> Auditoria HMAC dos webhooks
          </CardTitle>
          <CardDescription>
            Validações registadas pelo módulo <code>_shared/hmac.ts</code> em todos os webhooks de WhatsApp.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Válidos</div><div className="text-2xl font-bold text-emerald-600">{secStats.valid}</div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Rejeitados</div><div className="text-2xl font-bold text-red-600">{secStats.invalid}</div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Sem secret (skipped)</div><div className="text-2xl font-bold text-amber-600">{secStats.skipped}</div></CardContent></Card>
          </div>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem eventos ainda. Aguarde o próximo webhook.</p>
          ) : (
            <div className="rounded-md border max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quando</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Modo</TableHead>
                    <TableHead>Resultado</TableHead>
                    <TableHead>Motivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="text-xs">{new Date(e.created_at).toLocaleString("pt-PT")}</TableCell>
                      <TableCell className="text-xs font-mono">{e.function_name}</TableCell>
                      <TableCell className="text-xs">{e.provider}</TableCell>
                      <TableCell className="text-xs">{e.validation_mode}</TableCell>
                      <TableCell>{statusBadge(e.outcome)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{e.reason ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Smoke runs history */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de smoke tests</CardTitle>
        </CardHeader>
        <CardContent>
          {runs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem execuções registadas.</p>
          ) : (
            <div className="rounded-md border max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quando</TableHead>
                    <TableHead>Suite</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Sumário</TableHead>
                    <TableHead>Duração</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runs.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs">{new Date(r.created_at).toLocaleString("pt-PT")}</TableCell>
                      <TableCell className="text-xs">{SUITE_META[r.suite]?.label ?? r.suite}</TableCell>
                      <TableCell>{statusBadge(r.status)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.summary ?? "—"}</TableCell>
                      <TableCell className="text-xs">{r.duration_ms ? `${r.duration_ms}ms` : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
