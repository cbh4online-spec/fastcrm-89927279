/**
 * Autopilot Toggle - Compact toggle for global or per-conversation autopilot control
 */

import { useState } from "react";
import { useAutopilotConfig } from "@/hooks/useAutopilotConfig";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bot, Loader2, Settings2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

interface AutopilotToggleProps {
  variant?: "button" | "badge";
  showSettings?: boolean;
}

export function AutopilotToggle({ variant = "button", showSettings = true }: AutopilotToggleProps) {
  const { config, isActive, toggleActive, isLoading } = useAutopilotConfig();
  const [isToggling, setIsToggling] = useState(false);

  const handleToggle = async () => {
    setIsToggling(true);
    try {
      await toggleActive(!isActive);
    } finally {
      setIsToggling(false);
    }
  };

  if (isLoading) {
    return (
      <Button variant="ghost" size="sm" disabled>
        <Loader2 className="w-4 h-4 animate-spin" />
      </Button>
    );
  }

  if (variant === "badge") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant={isActive ? "default" : "secondary"}
              className={cn(
                "gap-1 cursor-pointer transition-all",
                isActive && "bg-green-600 hover:bg-green-700"
              )}
              onClick={handleToggle}
            >
              {isToggling ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Bot className="w-3 h-3" />
              )}
              {isActive ? "ON" : "OFF"}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Clique para {isActive ? "desativar" : "ativar"} o Auto-Pilot</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={isActive ? "default" : "outline"}
          size="sm"
          className={cn(
            "gap-2 transition-all",
            isActive && "bg-green-600 hover:bg-green-700 text-white"
          )}
        >
          {isToggling ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Bot className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">
            {isActive ? "Autopilot ON" : "Autopilot"}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className={cn(
                "w-5 h-5",
                isActive ? "text-green-600" : "text-muted-foreground"
              )} />
              <div>
                <h4 className="font-medium text-sm">Auto-Pilot</h4>
                <p className="text-xs text-muted-foreground">
                  Respostas automáticas da IA
                </p>
              </div>
            </div>
            <Switch
              checked={isActive}
              onCheckedChange={handleToggle}
              disabled={isToggling}
            />
          </div>

          {config && isActive && (
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Delay de resposta
                </span>
                <span className="font-medium">
                  {config.response_delay_min}-{config.response_delay_max}s
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Máx. mensagens</span>
                <span className="font-medium">
                  {config.max_messages_per_conversation}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Pausa com humano</span>
                <Badge variant="secondary" className="text-[10px]">
                  {config.sleep_on_human_reply ? "Sim" : "Não"}
                </Badge>
              </div>
            </div>
          )}

          {showSettings && (
            <div className="pt-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-xs"
                asChild
              >
                <Link to="/dashboard/conversational-engine">
                  <Settings2 className="w-3 h-3" />
                  Configurar Auto-Pilot
                </Link>
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
