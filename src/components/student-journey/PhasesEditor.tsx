import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, GripVertical, AlertCircle, CalendarRange } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PhaseDraft {
  /** Id local (uuid simples) — só para keys; não é persistido como tal */
  uid: string;
  title: string;
  location: string;
  start_date: string; // yyyy-mm-dd
  end_date: string;
  start_time: string; // HH:mm
  end_time: string;
  notes?: string;
}

export interface PhaseValidationIssue {
  uid: string;
  field?: keyof PhaseDraft;
  message: string;
}

interface PhasesEditorProps {
  phases: PhaseDraft[];
  onChange: (next: PhaseDraft[]) => void;
  /** Permite ocultar a label principal se já existe contexto */
  hideHeader?: boolean;
  className?: string;
}

export function newEmptyPhase(order: number): PhaseDraft {
  return {
    uid: `tmp-${order}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: order === 1 ? "Parte 1" : `Parte ${order}`,
    location: "",
    start_date: "",
    end_date: "",
    start_time: "",
    end_time: "",
    notes: "",
  };
}

/**
 * Validação completa das fases.
 * Regras:
 *  - Título e datas obrigatórios
 *  - end_date >= start_date
 *  - Se ambos os tempos preenchidos no mesmo dia, end_time > start_time
 *  - Sem sobreposição entre fases (intervalos [start, end] inclusivos)
 */
export function validatePhases(phases: PhaseDraft[]): PhaseValidationIssue[] {
  const issues: PhaseValidationIssue[] = [];

  if (phases.length === 0) return issues;

  phases.forEach((p) => {
    if (!p.title.trim()) {
      issues.push({ uid: p.uid, field: "title", message: "Título obrigatório" });
    }
    if (!p.start_date) {
      issues.push({ uid: p.uid, field: "start_date", message: "Data de início obrigatória" });
    }
    if (!p.end_date) {
      issues.push({ uid: p.uid, field: "end_date", message: "Data de fim obrigatória" });
    }
    if (p.start_date && p.end_date && p.end_date < p.start_date) {
      issues.push({
        uid: p.uid,
        field: "end_date",
        message: "Data de fim não pode ser anterior à de início",
      });
    }
    if (
      p.start_date &&
      p.end_date &&
      p.start_date === p.end_date &&
      p.start_time &&
      p.end_time &&
      p.end_time <= p.start_time
    ) {
      issues.push({
        uid: p.uid,
        field: "end_time",
        message: "Hora de fim deve ser depois da hora de início",
      });
    }
  });

  // Sobreposição: comparar pares (apenas se datas válidas)
  const sortable = phases
    .filter((p) => p.start_date && p.end_date && p.end_date >= p.start_date)
    .map((p) => ({
      uid: p.uid,
      from: p.start_date,
      to: p.end_date,
    }))
    .sort((a, b) => (a.from < b.from ? -1 : 1));

  for (let i = 1; i < sortable.length; i++) {
    const prev = sortable[i - 1];
    const cur = sortable[i];
    if (cur.from <= prev.to) {
      issues.push({
        uid: cur.uid,
        field: "start_date",
        message: `Sobrepõe-se a outra fase (${prev.from} → ${prev.to})`,
      });
    }
  }

  return issues;
}

export function PhasesEditor({ phases, onChange, hideHeader, className }: PhasesEditorProps) {
  const issues = useMemo(() => validatePhases(phases), [phases]);

  const issuesByUid = useMemo(() => {
    const map = new Map<string, PhaseValidationIssue[]>();
    issues.forEach((i) => {
      if (!map.has(i.uid)) map.set(i.uid, []);
      map.get(i.uid)!.push(i);
    });
    return map;
  }, [issues]);

  const updatePhase = (uid: string, patch: Partial<PhaseDraft>) => {
    onChange(phases.map((p) => (p.uid === uid ? { ...p, ...patch } : p)));
  };

  const removePhase = (uid: string) => {
    onChange(phases.filter((p) => p.uid !== uid));
  };

  const addPhase = () => {
    const next = newEmptyPhase(phases.length + 1);
    // pré-preenche a data de início com a data fim da fase anterior + 1 dia
    const last = phases[phases.length - 1];
    if (last?.end_date) {
      const d = new Date(last.end_date);
      d.setDate(d.getDate() + 1);
      const iso = d.toISOString().slice(0, 10);
      next.start_date = iso;
      next.end_date = iso;
    }
    onChange([...phases, next]);
  };

  const movePhase = (uid: string, dir: -1 | 1) => {
    const idx = phases.findIndex((p) => p.uid === uid);
    if (idx < 0) return;
    const target = idx + dir;
    if (target < 0 || target >= phases.length) return;
    const next = [...phases];
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  };

  return (
    <div className={cn("space-y-3", className)}>
      {!hideHeader && (
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-semibold flex items-center gap-2">
              <CalendarRange className="h-4 w-4" />
              Fases do curso
            </Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Adicione uma ou mais fases (ex: Parte 1: 1–4 Mar, Parte 2: 15–18 Mar).
            </p>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={addPhase}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar fase
          </Button>
        </div>
      )}

      {phases.length === 0 && (
        <div className="border border-dashed rounded-lg p-6 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            Sem fases definidas. Clique para adicionar a primeira fase.
          </p>
          <Button type="button" size="sm" onClick={addPhase}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar fase
          </Button>
        </div>
      )}

      {phases.map((p, idx) => {
        const phaseIssues = issuesByUid.get(p.uid) || [];
        const fieldErr = (f: keyof PhaseDraft) =>
          phaseIssues.find((i) => i.field === f)?.message;

        return (
          <Card key={p.uid} className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => movePhase(p.uid, -1)}
                    disabled={idx === 0}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Mover para cima"
                  >
                    <GripVertical className="h-4 w-4" />
                  </button>
                </div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Fase {idx + 1}
                </span>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => removePhase(p.uid)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs">Título *</Label>
                <Input
                  value={p.title}
                  maxLength={120}
                  onChange={(e) => updatePhase(p.uid, { title: e.target.value })}
                  placeholder="Ex: Parte 1, Módulo A"
                  className={fieldErr("title") ? "border-destructive" : ""}
                />
                {fieldErr("title") && (
                  <p className="text-xs text-destructive">{fieldErr("title")}</p>
                )}
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Local</Label>
                <Input
                  value={p.location}
                  maxLength={200}
                  onChange={(e) => updatePhase(p.uid, { location: e.target.value })}
                  placeholder="Ex: Lisboa, Online"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs">Data início *</Label>
                <Input
                  type="date"
                  value={p.start_date}
                  onChange={(e) => updatePhase(p.uid, { start_date: e.target.value })}
                  className={fieldErr("start_date") ? "border-destructive" : ""}
                />
                {fieldErr("start_date") && (
                  <p className="text-xs text-destructive">{fieldErr("start_date")}</p>
                )}
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Data fim *</Label>
                <Input
                  type="date"
                  value={p.end_date}
                  onChange={(e) => updatePhase(p.uid, { end_date: e.target.value })}
                  className={fieldErr("end_date") ? "border-destructive" : ""}
                />
                {fieldErr("end_date") && (
                  <p className="text-xs text-destructive">{fieldErr("end_date")}</p>
                )}
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Hora início</Label>
                <Input
                  type="time"
                  value={p.start_time}
                  onChange={(e) => updatePhase(p.uid, { start_time: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Hora fim</Label>
                <Input
                  type="time"
                  value={p.end_time}
                  onChange={(e) => updatePhase(p.uid, { end_time: e.target.value })}
                  className={fieldErr("end_time") ? "border-destructive" : ""}
                />
                {fieldErr("end_time") && (
                  <p className="text-xs text-destructive">{fieldErr("end_time")}</p>
                )}
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label className="text-xs">Notas (opcional)</Label>
              <Textarea
                rows={2}
                value={p.notes || ""}
                maxLength={500}
                onChange={(e) => updatePhase(p.uid, { notes: e.target.value })}
                placeholder="Observações, materiais necessários, etc."
              />
            </div>
          </Card>
        );
      })}

      {phases.length > 0 && hideHeader && (
        <Button type="button" size="sm" variant="outline" onClick={addPhase} className="w-full">
          <Plus className="h-4 w-4 mr-1" /> Adicionar fase
        </Button>
      )}

      {issues.length > 0 && (
        <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/5 border border-destructive/20 rounded-md p-2.5">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            {issues.length} {issues.length === 1 ? "problema" : "problemas"} a resolver antes de guardar.
          </span>
        </div>
      )}
    </div>
  );
}
