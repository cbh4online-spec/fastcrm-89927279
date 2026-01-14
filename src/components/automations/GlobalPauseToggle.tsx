import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Pause, Play } from "lucide-react";
import { 
  useAutomationGlobalPause, 
  useToggleGlobalPause 
} from "@/hooks/useAutomationSafety";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  variant?: "card" | "inline";
}

export function GlobalPauseToggle({ variant = "inline" }: Props) {
  const { data: isPaused, isLoading } = useAutomationGlobalPause();
  const togglePause = useToggleGlobalPause();

  const handleToggle = (checked: boolean) => {
    togglePause.mutate(checked);
  };

  if (variant === "card") {
    return (
      <Card className={isPaused ? "border-amber-500" : ""}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isPaused ? (
                <Pause className="h-5 w-5 text-amber-500" />
              ) : (
                <Play className="h-5 w-5 text-green-500" />
              )}
              <CardTitle className="text-base">Pausa Global</CardTitle>
            </div>
            {isPaused && (
              <Badge className="bg-amber-500">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Pausado
              </Badge>
            )}
          </div>
          <CardDescription>
            {isPaused 
              ? "Todas as automações estão pausadas. Nenhuma será executada."
              : "As automações ativas estão a executar normalmente."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label htmlFor="global-pause-card" className="text-sm">
              Pausar todas as automações
            </Label>
            {isLoading ? (
              <Skeleton className="h-6 w-10" />
            ) : (
              <Switch
                id="global-pause-card"
                checked={isPaused}
                onCheckedChange={handleToggle}
                disabled={togglePause.isPending}
              />
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Inline variant
  return (
    <div className="flex items-center gap-3">
      {isPaused && (
        <Badge className="bg-amber-500 gap-1">
          <AlertTriangle className="h-3 w-3" />
          Pausado Globalmente
        </Badge>
      )}
      <div className="flex items-center gap-2">
        <Label htmlFor="global-pause" className="text-sm text-muted-foreground">
          Pausar tudo
        </Label>
        {isLoading ? (
          <Skeleton className="h-5 w-9" />
        ) : (
          <Switch
            id="global-pause"
            checked={isPaused}
            onCheckedChange={handleToggle}
            disabled={togglePause.isPending}
          />
        )}
      </div>
    </div>
  );
}
