import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Trophy, Sparkles, Zap, Loader2 } from "lucide-react";
import { useUserProgression, getLevelInfo } from "@/hooks/useUserProgression";
import { cn } from "@/lib/utils";

interface Props {
  variant?: "compact" | "full";
  className?: string;
}

export function UserProgressionWidget({ variant = "compact", className }: Props) {
  const { data: progression, isLoading } = useUserProgression();

  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-2 text-muted-foreground", className)}>
        <Loader2 className="w-4 h-4 animate-spin" />
      </div>
    );
  }

  if (!progression) return null;

  const { progressPct, xpToNext, isMax } = getLevelInfo(progression.total_xp, progression.current_level);

  if (variant === "compact") {
    return (
      <div
        className={cn(
          "flex items-center gap-3 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/20",
          className,
        )}
        title={`${progression.total_xp} XP · ${isMax ? "Nível máximo" : `${xpToNext} XP para o próximo nível`}`}
      >
        <div className="relative w-7 h-7 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground text-xs font-bold">
          {progression.current_level}
        </div>
        <div className="flex flex-col min-w-[80px]">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-foreground">Nível {progression.current_level}</span>
            <span className="text-muted-foreground">{progression.total_xp} XP</span>
          </div>
          <Progress value={progressPct} className="h-1 mt-0.5" />
        </div>
      </div>
    );
  }

  return (
    <Card className={cn("p-5 space-y-4", className)}>
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground text-xl font-bold shadow">
          {progression.current_level}
        </div>
        <div className="flex-1">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">A tua progressão</p>
          <p className="text-lg font-semibold text-foreground">Nível {progression.current_level}</p>
          <p className="text-xs text-muted-foreground">
            {isMax ? "Atingiste o nível máximo!" : `${xpToNext} XP para o próximo nível`}
          </p>
        </div>
      </div>

      <Progress value={progressPct} className="h-2" />

      <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border">
        <Stat icon={<Sparkles className="w-4 h-4" />} label="XP total" value={progression.total_xp.toLocaleString("pt-PT")} />
        <Stat icon={<Zap className="w-4 h-4" />} label="Módulos" value={progression.modules_completed} />
        <Stat icon={<Trophy className="w-4 h-4" />} label="Badges" value={progression.badges_earned} />
      </div>
    </Card>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="text-primary mb-1">{icon}</div>
      <p className="text-lg font-semibold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
