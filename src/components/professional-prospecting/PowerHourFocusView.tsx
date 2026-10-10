import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, ExternalLink, SkipForward, Timer, X } from "lucide-react";

export interface PowerHourProfile {
  id: string;
  profile_name: string | null;
  profile_url: string;
  inferred_profession: string | null;
}

interface PowerHourFocusViewProps {
  profile: PowerHourProfile;
  message: string;
  opened: boolean;
  sentCount: number;
  processedCount: number;
  total: number;
  sessionStartedAt: number;
  onMessageChange: (value: string) => void;
  onOpen: () => void;
  onSent: () => void;
  onSkip: () => void;
  onReject: () => void;
}

const GOAL_OPTIONS = [15, 25, 50];

function formatDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "TEXTAREA" || tag === "INPUT" || tag === "SELECT" || target.isContentEditable;
}

export function PowerHourFocusView({
  profile,
  message,
  opened,
  sentCount,
  processedCount,
  total,
  sessionStartedAt,
  onMessageChange,
  onOpen,
  onSent,
  onSkip,
  onReject,
}: PowerHourFocusViewProps) {
  const [goal, setGoal] = useState(25);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return;
      const key = e.key.toLowerCase();
      if (key === " " || key === "enter") {
        e.preventDefault();
        onOpen();
      } else if (key === "s") {
        e.preventDefault();
        onSent();
      } else if (key === "p") {
        e.preventDefault();
        onSkip();
      } else if (key === "r") {
        e.preventDefault();
        onReject();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onOpen, onSent, onSkip, onReject]);

  const elapsed = now - sessionStartedAt;
  const avgPerContact = sentCount > 0 ? elapsed / sentCount : 0;
  const goalTarget = Math.min(goal, total);
  const goalPercent = goalTarget > 0 ? Math.min(100, (sentCount / goalTarget) * 100) : 0;

  return (
    <div className="mt-4 flex flex-col gap-4 min-h-0 overflow-y-auto">
      {/* Ritmo e meta */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg border bg-card p-3">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Enviados</p>
          <p className="text-2xl font-bold">{sentCount}<span className="text-sm font-normal text-muted-foreground">/{goalTarget}</span></p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <Timer className="w-3 h-3" /> Sessão
          </p>
          <p className="text-2xl font-bold tabular-nums">{formatDuration(elapsed)}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Média</p>
          <p className="text-2xl font-bold tabular-nums">{sentCount > 0 ? formatDuration(avgPerContact) : "—"}</p>
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Meta da sessão</span>
          <div className="flex gap-1" role="group" aria-label="Meta da sessão">
            {GOAL_OPTIONS.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGoal(g)}
                aria-pressed={goal === g}
                className={`rounded-full border px-2 py-0.5 ${goal === g ? "border-primary text-primary" : "border-border"}`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
        <Progress value={goalPercent} className="h-2" />
        <p className="text-xs text-muted-foreground text-right">
          {processedCount} de {total} perfis tratados
        </p>
      </div>

      {/* Perfil atual */}
      <div className="rounded-2xl border bg-card p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xl font-bold tracking-tight truncate">{profile.profile_name || "Sem nome"}</p>
            {profile.inferred_profession && (
              <p className="text-sm text-muted-foreground truncate">{profile.inferred_profession}</p>
            )}
            <a
              href={profile.profile_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary inline-flex items-center gap-1 mt-1 break-all"
            >
              Ver perfil <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          {opened && (
            <Badge variant="outline" className="shrink-0">A aguardar confirmação</Badge>
          )}
        </div>
        <label htmlFor="power-hour-message" className="text-xs font-medium text-muted-foreground">
          Mensagem (pode editar antes de enviar)
        </label>
        <Textarea
          id="power-hour-message"
          value={message}
          onChange={(e) => onMessageChange(e.target.value)}
          rows={6}
          maxLength={2000}
        />
      </div>

      {/* Ações */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Button onClick={onOpen} className="gap-2" disabled={!message.trim()}>
          <ExternalLink className="w-4 h-4" /> Preparar DM
          <kbd className="ml-1 text-[10px] opacity-70">Espaço</kbd>
        </Button>
        <Button onClick={onSent} variant={opened ? "default" : "outline"} className="gap-2">
          <CheckCircle className="w-4 h-4" /> Já enviei
          <kbd className="ml-1 text-[10px] opacity-70">S</kbd>
        </Button>
        <Button onClick={onSkip} variant="outline" className="gap-2">
          <SkipForward className="w-4 h-4" /> Pular
          <kbd className="ml-1 text-[10px] opacity-70">P</kbd>
        </Button>
        <Button onClick={onReject} variant="ghost" className="gap-2 text-destructive hover:text-destructive">
          <X className="w-4 h-4" /> Rejeitar
          <kbd className="ml-1 text-[10px] opacity-70">R</kbd>
        </Button>
      </div>
      <p className="text-xs text-muted-foreground text-center">
        Preparar DM verifica e copia a mensagem; depois use «Abrir conversa», cole, envie e volte para confirmar.
      </p>
    </div>
  );
}
