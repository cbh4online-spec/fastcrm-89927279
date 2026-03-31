import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Clock, LogIn, LogOut } from "lucide-react";
import { useTimeEntries } from "@/hooks/useTimeEntries";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

export function ClockInOutButton() {
  const { activeEntry, clockIn, clockOut } = useTimeEntries();
  const isActive = !!activeEntry;

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center gap-4 p-6 rounded-xl border bg-card">
      <Clock className="h-8 w-8 text-muted-foreground" />
      <p className="text-3xl font-bold tabular-nums">
        {format(now, "HH:mm:ss", { locale: pt })}
      </p>
      <p className="text-sm text-muted-foreground">
        {format(now, "EEEE, d 'de' MMMM", { locale: pt })}
      </p>
      {isActive ? (
        <div className="flex flex-col items-center gap-2">
          <p className="text-xs text-green-600 font-medium">
            Em serviço desde {format(new Date(activeEntry!.clock_in), "HH:mm")}
          </p>
          <Button
            size="lg"
            variant="destructive"
            className="gap-2"
            onClick={() => clockOut.mutate(activeEntry!.id)}
            disabled={clockOut.isPending}
          >
            <LogOut className="h-5 w-5" />
            Terminar Trabalho
          </Button>
        </div>
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
  );
}
