import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  CalendarClock,
  Plus,
  Play,
  Pause,
  Trash2,
  Pencil,
  Repeat,
  PlayCircle,
  Clock,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";
import {
  useWhatsAppRecurring,
  useUpsertRecurring,
  useToggleRecurring,
  useDeleteRecurring,
  useRunRecurringNow,
  type WhatsAppRecurringCampaign,
  type RecurringFrequency,
  type RecurringTargetType,
} from "@/hooks/useWhatsAppRecurring";

const TIMEZONES = [
  "Europe/Lisbon",
  "Europe/Madrid",
  "Europe/London",
  "America/Sao_Paulo",
  "America/New_York",
  "UTC",
];

const WEEKDAYS = [
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
  { value: 0, label: "Dom" },
];

interface EditorState {
  id?: string;
  name: string;
  description: string;
  target_type: RecurringTargetType;
  target_tags: string;
  segment_id: string;
  body: string;
  cta_url: string;
  frequency: RecurringFrequency;
  weekly_days: number[];
  monthly_day: number;
  run_time: string;
  timezone: string;
  jitter_minutes: number;
  ends_at: string;
  max_runs: string;
}

const EMPTY_EDITOR: EditorState = {
  name: "",
  description: "",
  target_type: "tags",
  target_tags: "",
  segment_id: "",
  body: "",
  cta_url: "",
  frequency: "weekly",
  weekly_days: [1],
  monthly_day: 1,
  run_time: "09:00",
  timezone: "Europe/Lisbon",
  jitter_minutes: 5,
  ends_at: "",
  max_runs: "",
};

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; icon: typeof Clock }> = {
    active: { label: "Ativa", cls: "bg-emerald-500/15 text-emerald-600", icon: CheckCircle2 },
    paused: { label: "Pausada", cls: "bg-amber-500/15 text-amber-600", icon: Pause },
    completed: { label: "Concluída", cls: "bg-muted text-muted-foreground", icon: CheckCircle2 },
  };
  const m = map[status] ?? map.active;
  const Icon = m.icon;
  return (
    <Badge className={`text-xs gap-1 ${m.cls}`} variant="outline">
      <Icon className="h-3 w-3" /> {m.label}
    </Badge>
  );
}

function frequencyLabel(c: WhatsAppRecurringCampaign): string {
  if (c.frequency === "daily") return `Todos os dias às ${c.run_time}`;
  if (c.frequency === "weekly") {
    const days = (c.weekly_days || []).map((d) => WEEKDAYS.find((w) => w.value === d)?.label || "").join(", ");
    return `${days || "—"} às ${c.run_time}`;
  }
  return `Dia ${c.monthly_day} de cada mês às ${c.run_time}`;
}

export default function WhatsAppRecurringPage() {
  const { data: list, isLoading } = useWhatsAppRecurring();
  const upsert = useUpsertRecurring();
  const toggle = useToggleRecurring();
  const del = useDeleteRecurring();
  const tick = useRunRecurringNow();

  const [open, setOpen] = useState(false);
  const [editor, setEditor] = useState<EditorState>(EMPTY_EDITOR);

  const kpis = useMemo(() => {
    const all = list || [];
    return {
      total: all.length,
      active: all.filter((c) => c.status === "active").length,
      paused: all.filter((c) => c.status === "paused").length,
      lastDispatch: all.reduce((acc, c) => acc + (c.last_dispatch_count || 0), 0),
    };
  }, [list]);

  function openCreate() {
    setEditor(EMPTY_EDITOR);
    setOpen(true);
  }

  function openEdit(c: WhatsAppRecurringCampaign) {
    setEditor({
      id: c.id,
      name: c.name,
      description: c.description || "",
      target_type: c.target_type,
      target_tags: (c.target_tags || []).join(", "),
      segment_id: c.segment_id || "",
      body: c.body,
      cta_url: c.cta_url || "",
      frequency: c.frequency,
      weekly_days: c.weekly_days || [],
      monthly_day: c.monthly_day || 1,
      run_time: c.run_time?.slice(0, 5) || "09:00",
      timezone: c.timezone,
      jitter_minutes: c.jitter_minutes || 0,
      ends_at: c.ends_at ? c.ends_at.slice(0, 16) : "",
      max_runs: c.max_runs ? String(c.max_runs) : "",
    });
    setOpen(true);
  }

  async function save() {
    if (!editor.name.trim() || !editor.body.trim()) {
      toast.error("Nome e mensagem obrigatórios");
      return;
    }
    if (editor.target_type === "tags" && !editor.target_tags.trim()) {
      toast.error("Indica pelo menos uma tag");
      return;
    }
    if (editor.frequency === "weekly" && editor.weekly_days.length === 0) {
      toast.error("Escolhe pelo menos um dia da semana");
      return;
    }
    await upsert.mutateAsync({
      id: editor.id,
      name: editor.name.trim(),
      description: editor.description.trim() || undefined,
      target_type: editor.target_type,
      target_tags: editor.target_tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      segment_id: editor.segment_id || null,
      body: editor.body,
      cta_url: editor.cta_url.trim() || null,
      frequency: editor.frequency,
      weekly_days: editor.weekly_days,
      monthly_day: editor.monthly_day,
      run_time: editor.run_time,
      timezone: editor.timezone,
      jitter_minutes: editor.jitter_minutes,
      ends_at: editor.ends_at ? new Date(editor.ends_at).toISOString() : null,
      max_runs: editor.max_runs ? parseInt(editor.max_runs, 10) : null,
    });
    setOpen(false);
  }

  function toggleWeekday(d: number) {
    setEditor((s) => ({
      ...s,
      weekly_days: s.weekly_days.includes(d)
        ? s.weekly_days.filter((x) => x !== d)
        : [...s.weekly_days, d].sort(),
    }));
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Repeat className="h-7 w-7 text-primary" />
            <div>
              <h1 className="text-2xl font-semibold">Campanhas Recorrentes WhatsApp</h1>
              <p className="text-sm text-muted-foreground">
                Agenda envios automáticos diários, semanais ou mensais com fuso horário e jitter.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => tick.mutate()} disabled={tick.isPending}>
              <PlayCircle className="h-4 w-4 mr-2" /> Executar tick agora
            </Button>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" /> Nova campanha
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">Total</div>
              <div className="text-2xl font-semibold">{kpis.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">Ativas</div>
              <div className="text-2xl font-semibold text-emerald-600">{kpis.active}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">Pausadas</div>
              <div className="text-2xl font-semibold text-amber-600">{kpis.paused}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">Última leva</div>
              <div className="text-2xl font-semibold">{kpis.lastDispatch}</div>
            </CardContent>
          </Card>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-44 rounded-lg" />
            ))}
          </div>
        ) : (list || []).length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-sm text-muted-foreground">
              <CalendarClock className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
              Sem campanhas recorrentes. Cria a primeira para começar.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {(list || []).map((c) => (
              <Card key={c.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">{c.name}</CardTitle>
                      {c.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{c.description}</p>
                      )}
                    </div>
                    <StatusBadge status={c.status} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      {frequencyLabel(c)} ({c.timezone})
                    </div>
                    <div>
                      <span className="font-medium">Alvo:</span>{" "}
                      {c.target_type === "all"
                        ? "Todos os contactos"
                        : c.target_type === "tags"
                        ? `Tags: ${(c.target_tags || []).join(", ") || "—"}`
                        : "Segmento"}
                    </div>
                    <div>
                      <span className="font-medium">Próxima:</span>{" "}
                      {c.next_run_at
                        ? format(new Date(c.next_run_at), "dd/MM/yyyy HH:mm", { locale: pt })
                        : "—"}
                    </div>
                    <div>
                      <span className="font-medium">Execuções:</span> {c.run_count}
                      {c.max_runs ? ` / ${c.max_runs}` : ""}
                      {" · "}última leva: {c.last_dispatch_count}
                      {c.jitter_minutes > 0 && ` · jitter ±${c.jitter_minutes}m`}
                    </div>
                    {c.last_error && (
                      <div className="flex items-start gap-1 text-amber-600">
                        <AlertTriangle className="h-3 w-3 mt-0.5" />
                        <span className="line-clamp-1">{c.last_error}</span>
                      </div>
                    )}
                  </div>

                  <div className="bg-muted/40 rounded-md p-2 border text-xs whitespace-pre-line line-clamp-3">
                    {c.body}
                  </div>

                  <div className="flex gap-2">
                    {c.status === "active" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggle.mutate({ id: c.id, status: "paused" })}
                      >
                        <Pause className="h-3.5 w-3.5 mr-1" /> Pausar
                      </Button>
                    ) : c.status === "paused" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggle.mutate({ id: c.id, status: "active" })}
                      >
                        <Play className="h-3.5 w-3.5 mr-1" /> Retomar
                      </Button>
                    ) : null}
                    <Button size="sm" variant="ghost" onClick={() => openEdit(c)}>
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="ml-auto"
                      onClick={() => {
                        if (confirm(`Eliminar "${c.name}"?`)) del.mutate(c.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editor.id ? "Editar campanha recorrente" : "Nova campanha recorrente"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nome</Label>
                <Input
                  value={editor.name}
                  onChange={(e) => setEditor((s) => ({ ...s, name: e.target.value }))}
                  placeholder="Ex: Newsletter semanal"
                  maxLength={120}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Fuso horário</Label>
                <select
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={editor.timezone}
                  onChange={(e) => setEditor((s) => ({ ...s, timezone: e.target.value }))}
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Descrição (opcional)</Label>
              <Input
                value={editor.description}
                onChange={(e) => setEditor((s) => ({ ...s, description: e.target.value }))}
                maxLength={250}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Alvo</Label>
              <div className="flex gap-2">
                {(["tags", "all", "segment"] as RecurringTargetType[]).map((t) => (
                  <Button
                    key={t}
                    type="button"
                    variant={editor.target_type === t ? "default" : "outline"}
                    size="sm"
                    onClick={() => setEditor((s) => ({ ...s, target_type: t }))}
                  >
                    {t === "tags" ? "Por tags" : t === "all" ? "Todos" : "Segmento"}
                  </Button>
                ))}
              </div>
              {editor.target_type === "tags" && (
                <Input
                  className="mt-2"
                  placeholder="cliente, vip, lisboa (separadas por vírgula)"
                  value={editor.target_tags}
                  onChange={(e) => setEditor((s) => ({ ...s, target_tags: e.target.value }))}
                />
              )}
              {editor.target_type === "segment" && (
                <Input
                  className="mt-2"
                  placeholder="ID do segmento WhatsApp"
                  value={editor.segment_id}
                  onChange={(e) => setEditor((s) => ({ ...s, segment_id: e.target.value }))}
                />
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Mensagem</Label>
              <Textarea
                rows={5}
                value={editor.body}
                onChange={(e) => setEditor((s) => ({ ...s, body: e.target.value }))}
                placeholder="Olá {{primeiro_nome}}! Esta semana temos..."
                maxLength={2000}
              />
              <p className="text-[11px] text-muted-foreground">
                Suporta variáveis curtas (resolvidas no envio): <code>{`{{primeiro_nome}}`}</code>, <code>{`{{produto}}`}</code>, <code>{`{{link}}`}</code>...
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Link CTA (opcional)</Label>
              <Input
                value={editor.cta_url}
                onChange={(e) => setEditor((s) => ({ ...s, cta_url: e.target.value }))}
                placeholder="https://loja.exemplo.com/promo"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Frequência</Label>
              <div className="flex gap-2">
                {(["daily", "weekly", "monthly"] as RecurringFrequency[]).map((f) => (
                  <Button
                    key={f}
                    type="button"
                    variant={editor.frequency === f ? "default" : "outline"}
                    size="sm"
                    onClick={() => setEditor((s) => ({ ...s, frequency: f }))}
                  >
                    {f === "daily" ? "Diária" : f === "weekly" ? "Semanal" : "Mensal"}
                  </Button>
                ))}
              </div>

              {editor.frequency === "weekly" && (
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {WEEKDAYS.map((d) => (
                    <Button
                      key={d.value}
                      type="button"
                      variant={editor.weekly_days.includes(d.value) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleWeekday(d.value)}
                    >
                      {d.label}
                    </Button>
                  ))}
                </div>
              )}

              {editor.frequency === "monthly" && (
                <div className="mt-2 flex items-center gap-2">
                  <Label className="text-sm">Dia do mês:</Label>
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    className="w-20"
                    value={editor.monthly_day}
                    onChange={(e) =>
                      setEditor((s) => ({ ...s, monthly_day: parseInt(e.target.value, 10) || 1 }))
                    }
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Hora</Label>
                <Input
                  type="time"
                  value={editor.run_time}
                  onChange={(e) => setEditor((s) => ({ ...s, run_time: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Jitter (min)</Label>
                <Input
                  type="number"
                  min={0}
                  max={180}
                  value={editor.jitter_minutes}
                  onChange={(e) =>
                    setEditor((s) => ({ ...s, jitter_minutes: parseInt(e.target.value, 10) || 0 }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Máx. execuções</Label>
                <Input
                  type="number"
                  min={1}
                  placeholder="∞"
                  value={editor.max_runs}
                  onChange={(e) => setEditor((s) => ({ ...s, max_runs: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Termina em (opcional)</Label>
              <Input
                type="datetime-local"
                value={editor.ends_at}
                onChange={(e) => setEditor((s) => ({ ...s, ends_at: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={upsert.isPending}>
              {upsert.isPending ? "A guardar..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
