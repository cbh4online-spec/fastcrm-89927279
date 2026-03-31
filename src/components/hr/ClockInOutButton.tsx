import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { LogIn, LogOut, Timer } from "lucide-react";
import { useTimeEntries } from "@/hooks/useTimeEntries";
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

export function ClockInOutButton() {
  const { activeEntry, clockIn, clockOut } = useTimeEntries();
  const { city, temperature, weatherCode, isLoading: weatherLoading } = useWeatherLocation();
  const isActive = !!activeEntry;

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const sessionMs = useMemo(() => {
    if (!activeEntry) return 0;
    return now.getTime() - new Date(activeEntry.clock_in).getTime();
  }, [now, activeEntry]);

  const greeting = getGreeting(now.getHours());
  const weatherIcon = getWeatherIcon(weatherCode);
  const weatherText = temperature !== null
    ? `${weatherIcon} ${Math.round(temperature)}°C${city ? ` · ${city}` : ""}`
    : city
      ? `📍 ${city}`
      : null;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 p-5 rounded-xl border bg-card shadow-sm">
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
      {isActive && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/20">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
          </span>
          <div className="flex flex-col items-start">
            <span className="text-xs text-green-700 dark:text-green-400 font-medium">Em serviço</span>
            <span className="text-sm font-bold tabular-nums text-green-800 dark:text-green-300 flex items-center gap-1">
              <Timer className="h-3.5 w-3.5" />
              {formatDuration(sessionMs)}
            </span>
          </div>
        </div>
      )}

      {/* Right — Action button */}
      <div className="sm:ml-auto">
        {isActive ? (
          <Button
            size="lg"
            variant="destructive"
            className="gap-2"
            onClick={() => clockOut.mutate(activeEntry!.id)}
            disabled={clockOut.isPending}
          >
            <LogOut className="h-5 w-5" />
            Terminar
          </Button>
        ) : (
          <Button
            size="lg"
            className="gap-2"
            onClick={() => clockIn.mutate()}
            disabled={clockIn.isPending}
          >
            <LogIn className="h-5 w-5" />
            Iniciar Trabalho
          </Button>
        )}
      </div>
    </div>
  );
}
