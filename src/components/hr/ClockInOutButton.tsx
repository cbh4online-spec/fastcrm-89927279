import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { LogIn, LogOut, Timer, AlertTriangle, Coffee, Play } from "lucide-react";
import { useCurrentEmployee } from "@/hooks/hr/useCurrentEmployee";
import { useClockAction, useHRWorkSessions } from "@/hooks/hr/useHRTimeEntries";
import { useWeatherLocation, getWeatherIcon } from "@/hooks/useWeatherLocation";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

function formatDuration(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
}

function getGreeting(hour: number) {
  if (hour < 12) return "Bom dia";
  if (hour < 20) return "Boa tarde";
  return "Boa noite";
}

const SESSION_TYPE_LABELS: Record<string, string> = {
  morning: "Manhã",
  afternoon: "Tarde",
  extra: "Extra",
};

export function ClockInOutButton() {
  const { employeeId, isLoading: empLoading, hasEmployee } = useCurrentEmployee();
  const clockAction = useClockAction();
  const today = format(new Date(), "yyyy-MM-dd");
  const { data: sessions = [] } = useHRWorkSessions(employeeId ?? undefined, today, today);
  const { city, temperature, weatherCode, isLoading: weatherLoading } = useWeatherLocation();

  // Find active session (no clock_out_at)
  const activeSession = useMemo(
    () => sessions.find((s) => s.clock_in_at && !s.clock_out_at),
    [sessions]
  );
  const isActive = !!activeSession;
  const onBreak = !!(activeSession?.break_start_at && !activeSession?.break_end_at);

  // Completed sessions
  const completedSessions = useMemo(
    () => sessions.filter((s) => s.clock_out_at),
    [sessions]
  );
  const totalWorkedToday = useMemo(
    () => completedSessions.reduce((sum, s) => sum + (s.worked_minutes || 0), 0),
    [completedSessions]
  );

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const sessionMs = useMemo(() => {
    if (!activeSession?.clock_in_at) return 0;
    return now.getTime() - new Date(activeSession.clock_in_at).getTime();
  }, [now, activeSession]);

  const greeting = getGreeting(now.getHours());
  const weatherIcon = getWeatherIcon(weatherCode);
  const weatherText = temperature !== null
    ? `${weatherIcon} ${Math.round(temperature)}°C${city ? ` · ${city}` : ""}`
    : city
      ? `📍 ${city}`
      : null;

  if (!empLoading && !hasEmployee) {
    return (
      <div className="flex items-center gap-3 p-5 rounded-xl border bg-card shadow-sm">
        <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
        <p className="text-sm text-muted-foreground">
          O seu perfil de colaborador ainda não está configurado. Contacte o administrador de RH.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-5 rounded-xl border bg-card shadow-sm">
      <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
        {/* Left — Clock & context */}
        <div className="flex flex-col items-center sm:items-start gap-1 min-w-0">
          <p className="text-3xl font-bold tabular-nums tracking-tight text-foreground">
            {format(now, "HH:mm:ss", { locale: pt })}
          </p>
          <p className="text-sm text-muted-foreground capitalize">
            {format(now, "EEEE, d 'de' MMMM", { locale: pt })}
          </p>
          {weatherText && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {greeting}! {weatherText}
            </p>
          )}
          {!weatherText && !weatherLoading && (
            <p className="text-xs text-muted-foreground mt-0.5">{greeting}!</p>
          )}
        </div>

        {/* Center — Session timer */}
        {isActive && !onBreak && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/20">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
            </span>
            <div className="flex flex-col items-start">
              <span className="text-xs text-green-700 dark:text-green-400 font-medium">
                Em serviço — {SESSION_TYPE_LABELS[activeSession?.session_type || "morning"] || "Sessão"}
              </span>
              <span className="text-sm font-bold tabular-nums text-green-800 dark:text-green-300 flex items-center gap-1">
                <Timer className="h-3.5 w-3.5" />
                {formatDuration(sessionMs)}
              </span>
            </div>
          </div>
        )}

        {isActive && onBreak && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <Coffee className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <div className="flex flex-col items-start">
              <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">Em pausa</span>
              <span className="text-sm font-bold tabular-nums text-amber-800 dark:text-amber-300">
                {formatDuration(now.getTime() - new Date(activeSession!.break_start_at!).getTime())}
              </span>
            </div>
          </div>
        )}

        {/* Right — Action buttons */}
        <div className="sm:ml-auto flex gap-2">
          {isActive && onBreak ? (
            <Button
              size="lg"
              className="gap-2"
              onClick={() =>
                clockAction.mutate({
                  employee_id: employeeId!,
                  entry_type: "break_end",
                  method: "app",
                })
              }
              disabled={clockAction.isPending}
            >
              <Play className="h-5 w-5" />
              Retomar
            </Button>
          ) : isActive ? (
            <>
              <Button
                size="lg"
                variant="outline"
                className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-600 dark:text-amber-400 dark:hover:bg-amber-900/20"
                onClick={() =>
                  clockAction.mutate({
                    employee_id: employeeId!,
                    entry_type: "break_start",
                    method: "app",
                  })
                }
                disabled={clockAction.isPending}
              >
                <Coffee className="h-5 w-5" />
                Pausa
              </Button>
              <Button
                size="lg"
                variant="destructive"
                className="gap-2"
                onClick={() =>
                  clockAction.mutate({
                    employee_id: employeeId!,
                    entry_type: "clock_out",
                    method: "app",
                  })
                }
                disabled={clockAction.isPending}
              >
                <LogOut className="h-5 w-5" />
                Terminar
              </Button>
            </>
          ) : (
            <Button
              size="lg"
              className="gap-2"
              onClick={() =>
                clockAction.mutate({
                  employee_id: employeeId!,
                  entry_type: "clock_in",
                  method: "app",
                })
              }
              disabled={clockAction.isPending || empLoading}
            >
              <LogIn className="h-5 w-5" />
              {completedSessions.length > 0 ? "Retomar Trabalho" : "Iniciar Trabalho"}
            </Button>
          )}
        </div>
      </div>

      {/* Day summary — completed sessions */}
      {completedSessions.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-border/50">
          <span className="text-xs text-muted-foreground font-medium">Hoje:</span>
          {completedSessions.map((s) => (
            <div key={s.id} className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
              <span className="font-medium">{SESSION_TYPE_LABELS[s.session_type] || s.session_type}</span>
              <span>
                {s.clock_in_at ? format(new Date(s.clock_in_at), "HH:mm") : "—"}
                –
                {s.clock_out_at ? format(new Date(s.clock_out_at), "HH:mm") : "—"}
              </span>
              {s.break_minutes > 0 && (
                <span className="text-amber-600 dark:text-amber-400">({s.break_minutes}m pausa)</span>
              )}
            </div>
          ))}
          <span className="ml-auto text-xs font-semibold text-foreground">
            Total: {Math.floor(totalWorkedToday / 60)}h {totalWorkedToday % 60}m
          </span>
        </div>
      )}
    </div>
  );
}
