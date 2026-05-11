import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Shield,
  Pause,
  Play,
  Flame,
  AlertTriangle,
  Save,
  Activity,
  TrendingUp,
  Plus,
} from "lucide-react";
import {
  useThrottleSettings,
  useThrottleStatus,
  useUpsertThrottleSettings,
  useTogglePause,
  useStartWarmup,
  useDailyCounters,
  type ThrottleSettings,
} from "@/hooks/useWhatsAppThrottle";

const DEFAULTS: Partial<ThrottleSettings> = {
  max_per_day: 300,
  min_interval_seconds: 8,
  max_interval_seconds: 25,
  error_pause_threshold: 20,
  error_pause_window_minutes: 30,
  warmup_enabled: false,
  warmup_start_per_day: 30,
  warmup_increment_per_day: 20,
};

export default function WhatsAppThrottlePage() {
  const { data: list = [], isLoading } = useThrottleSettings();
  const { data: status } = useThrottleStatus(null);
  const { data: counters = [] } = useDailyCounters(14);
  const upsert = useUpsertThrottleSettings();
  const togglePause = useTogglePause();
  const startWarmup = useStartWarmup();

  const workspaceSetting = list.find((s) => !s.instance_id);
  const [draft, setDraft] = useState<Partial<ThrottleSettings>>(workspaceSetting ?? DEFAULTS);

  // sync draft when settings load
  if (workspaceSetting && draft.id !== workspaceSetting.id) {
    setDraft(workspaceSetting);
  }

  const set = <K extends keyof ThrottleSettings>(k: K, v: ThrottleSettings[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const usagePct =
    status?.limit && status.sent_today
      ? Math.min(100, Math.round((status.sent_today / status.limit) * 100))
      : 0;

  const errorRate =
    status && (status.sent_today + (status.error_today ?? 0)) > 0
      ? Math.round(
          ((status.error_today ?? 0) / (status.sent_today + (status.error_today ?? 0))) * 100,
        )
      : 0;

  const totalSent = counters.reduce((acc, c) => acc + c.sent_count, 0);
  const totalErrors = counters.reduce((acc, c) => acc + c.error_count, 0);

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-6xl">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Anti-spam &amp; Throttling
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Limites diários, jitter aleatório, pausa automática por taxa de erro e warm-up
            gradual de instâncias novas.
          </p>
        </div>
        {workspaceSetting && (
          <Button
            variant={workspaceSetting.paused ? "default" : "outline"}
            onClick={() =>
              togglePause.mutate({ id: workspaceSetting.id, paused: !workspaceSetting.paused })
            }
            className="gap-1.5"
          >
            {workspaceSetting.paused ? (
              <>
                <Play className="h-4 w-4" /> Retomar
              </>
            ) : (
              <>
                <Pause className="h-4 w-4" /> Pausar envios
              </>
            )}
          </Button>
        )}
      </header>

      {workspaceSetting?.paused && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Envios pausados</AlertTitle>
          <AlertDescription>{workspaceSetting.paused_reason || "Pausa manual"}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Enviados hoje</CardDescription>
            <CardTitle className="text-2xl">{status?.sent_today ?? 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={usagePct} className="h-1.5" />
            <p className="text-[11px] text-muted-foreground mt-1">
              {usagePct}% de {status?.limit ?? "—"} permitidos
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Erros hoje</CardDescription>
            <CardTitle className="text-2xl">{status?.error_today ?? 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={errorRate >= 20 ? "destructive" : "secondary"}>
              {errorRate}% taxa erro
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Warm-up</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-1.5">
              <Flame className="h-5 w-5 text-orange-500" />
              {status?.warmup_enabled ? `Dia ${status.warmup_day}` : "Inativo"}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>14 dias</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-1.5">
              <TrendingUp className="h-5 w-5 text-primary" />
              {totalSent}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-muted-foreground">
              {totalErrors} erros · {totalSent + totalErrors > 0
                ? Math.round((totalErrors / (totalSent + totalErrors)) * 100)
                : 0}
              % média
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Limites &amp; jitter
          </CardTitle>
          <CardDescription>
            Define o ritmo de envio do workspace. Valores demasiado agressivos podem levar ao
            bloqueio do número Z-API.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">A carregar…</p>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="max">Máximo por dia</Label>
                  <Input
                    id="max"
                    type="number"
                    min={10}
                    max={5000}
                    value={draft.max_per_day ?? 300}
                    onChange={(e) => set("max_per_day", parseInt(e.target.value || "0", 10))}
                  />
                  <p className="text-[11px] text-muted-foreground">Recomendado: 200-500/dia</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="min">Intervalo mínimo (s)</Label>
                  <Input
                    id="min"
                    type="number"
                    min={1}
                    max={300}
                    value={draft.min_interval_seconds ?? 8}
                    onChange={(e) =>
                      set("min_interval_seconds", parseInt(e.target.value || "0", 10))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="maxi">Intervalo máximo (s)</Label>
                  <Input
                    id="maxi"
                    type="number"
                    min={1}
                    max={600}
                    value={draft.max_interval_seconds ?? 25}
                    onChange={(e) =>
                      set("max_interval_seconds", parseInt(e.target.value || "0", 10))
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-5">
                <div className="space-y-1.5">
                  <Label htmlFor="thr">Pausar se taxa de erro ≥ (%)</Label>
                  <Input
                    id="thr"
                    type="number"
                    step="0.5"
                    min={1}
                    max={100}
                    value={draft.error_pause_threshold ?? 20}
                    onChange={(e) =>
                      set("error_pause_threshold", parseFloat(e.target.value || "0"))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="win">Janela de avaliação (min)</Label>
                  <Input
                    id="win"
                    type="number"
                    min={5}
                    max={1440}
                    value={draft.error_pause_window_minutes ?? 30}
                    onChange={(e) =>
                      set("error_pause_window_minutes", parseInt(e.target.value || "0", 10))
                    }
                  />
                </div>
              </div>

              <div className="border-t pt-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base flex items-center gap-1.5">
                      <Flame className="h-4 w-4 text-orange-500" />
                      Warm-up gradual
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Ideal para instâncias novas: começa baixo e aumenta o limite por dia.
                    </p>
                  </div>
                  <Switch
                    checked={draft.warmup_enabled ?? false}
                    onCheckedChange={(v) => set("warmup_enabled", v)}
                  />
                </div>
                {draft.warmup_enabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Dia 1 — envios permitidos</Label>
                      <Input
                        type="number"
                        min={5}
                        max={500}
                        value={draft.warmup_start_per_day ?? 30}
                        onChange={(e) =>
                          set("warmup_start_per_day", parseInt(e.target.value || "0", 10))
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Incremento diário</Label>
                      <Input
                        type="number"
                        min={1}
                        max={200}
                        value={draft.warmup_increment_per_day ?? 20}
                        onChange={(e) =>
                          set("warmup_increment_per_day", parseInt(e.target.value || "0", 10))
                        }
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t">
                <div className="text-xs text-muted-foreground">
                  {workspaceSetting
                    ? `Atualizado em ${new Date(workspaceSetting.updated_at).toLocaleString("pt-PT")}`
                    : "Sem configuração — será criada ao guardar."}
                </div>
                <div className="flex gap-2">
                  {workspaceSetting && draft.warmup_enabled && !workspaceSetting.warmup_started_at && (
                    <Button
                      variant="outline"
                      onClick={() => startWarmup.mutate(workspaceSetting.id)}
                      className="gap-1.5"
                    >
                      <Flame className="h-4 w-4" /> Iniciar warm-up hoje
                    </Button>
                  )}
                  <Button onClick={() => upsert.mutate(draft)} className="gap-1.5">
                    {workspaceSetting ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    Guardar
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico (14 dias)</CardTitle>
        </CardHeader>
        <CardContent>
          {counters.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Sem envios registados ainda.
            </p>
          ) : (
            <div className="space-y-1.5">
              {counters.map((c) => {
                const total = c.sent_count + c.error_count;
                const errPct = total > 0 ? Math.round((c.error_count / total) * 100) : 0;
                return (
                  <div
                    key={c.id}
                    className="flex items-center justify-between text-sm border rounded px-3 py-2"
                  >
                    <span className="font-mono text-xs text-muted-foreground">{c.day}</span>
                    <div className="flex items-center gap-3">
                      <span>{c.sent_count} enviados</span>
                      {c.error_count > 0 && (
                        <Badge variant={errPct >= 20 ? "destructive" : "secondary"}>
                          {c.error_count} erros ({errPct}%)
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
