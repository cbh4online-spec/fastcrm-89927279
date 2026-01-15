import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { calculateTemperature, temperatureConfig, TemperatureResult } from "@/lib/conversationTemperature";
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
import { Progress } from "@/components/ui/progress";
import { Thermometer, Snowflake, Flame, Sun } from "lucide-react";

interface ConversationTemperatureProps {
  conversation: {
    messages?: Array<{
      direction: string;
      sent_at: string;
      content: string;
    }>;
    last_message_at?: string | null;
    created_at: string;
    unread_count: number;
    ai_intent?: string | null;
    user_intent?: string | null;
    lead?: {
      status?: string;
    } | null;
    opportunities?: Array<{
      status: string;
      value?: number | null;
    }>;
  };
  variant?: "badge" | "compact" | "full";
  showDetails?: boolean;
  className?: string;
}

const stateIcons = {
  cold: Snowflake,
  warm: Sun,
  hot: Flame,
};

export function ConversationTemperature({ 
  conversation, 
  variant = "badge",
  showDetails = false,
  className 
}: ConversationTemperatureProps) {
  const temperature = useMemo(() => calculateTemperature(conversation), [conversation]);
  const config = temperatureConfig[temperature.state];
  const StateIcon = stateIcons[temperature.state];

  if (variant === "compact") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              "flex items-center gap-1 text-xs px-1.5 py-0.5 rounded",
              config.color,
              config.bgColor,
              className
            )}>
              <StateIcon className="w-3 h-3" />
              <span>{temperature.score}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs font-medium">{config.label} ({temperature.score}/100)</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (variant === "badge") {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button className={cn(
            "flex items-center gap-1.5 text-xs px-2 py-1 rounded-full transition-all hover:ring-1 hover:ring-primary/30",
            config.color,
            config.bgColor,
            className
          )}>
            <StateIcon className="w-3.5 h-3.5" />
            <span className="font-medium">{temperature.score}</span>
            <span className="hidden sm:inline">• {config.label}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" align="start">
          <TemperatureDetails temperature={temperature} />
        </PopoverContent>
      </Popover>
    );
  }

  // Full variant
  return (
    <div className={cn("rounded-lg border p-4", className)}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Thermometer className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Temperatura</span>
        </div>
        <div className={cn("flex items-center gap-1.5 font-semibold", config.color)}>
          <StateIcon className="w-4 h-4" />
          <span>{temperature.score}</span>
          <span className="text-xs font-normal">/ 100</span>
        </div>
      </div>
      
      {/* Temperature bar */}
      <div className="relative h-2 rounded-full bg-muted overflow-hidden mb-3">
        <div 
          className={cn(
            "h-full rounded-full bg-gradient-to-r transition-all duration-500",
            config.gradient
          )}
          style={{ width: `${temperature.score}%` }}
        />
        {/* Temperature markers */}
        <div className="absolute top-0 left-[30%] h-full w-px bg-border" />
        <div className="absolute top-0 left-[60%] h-full w-px bg-border" />
      </div>

      {/* Labels */}
      <div className="flex justify-between text-[10px] text-muted-foreground mb-4">
        <span>Frio</span>
        <span>Morno</span>
        <span>Quente</span>
      </div>

      {showDetails && <TemperatureDetails temperature={temperature} showFactors />}
    </div>
  );
}

function TemperatureDetails({ 
  temperature, 
  showFactors = true 
}: { 
  temperature: TemperatureResult;
  showFactors?: boolean;
}) {
  const config = temperatureConfig[temperature.state];
  const StateIcon = stateIcons[temperature.state];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StateIcon className={cn("w-5 h-5", config.color)} />
          <div>
            <p className="font-medium text-sm">{config.label}</p>
            <p className="text-xs text-muted-foreground">{temperature.score} pontos</p>
          </div>
        </div>
        <div className={cn(
          "text-2xl font-bold",
          config.color
        )}>
          {temperature.score}
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative h-2 rounded-full bg-muted overflow-hidden">
        <div 
          className={cn(
            "h-full rounded-full bg-gradient-to-r transition-all duration-500",
            config.gradient
          )}
          style={{ width: `${temperature.score}%` }}
        />
      </div>

      {showFactors && (
        <div className="space-y-2 pt-2 border-t">
          <p className="text-xs font-medium text-muted-foreground">Fatores</p>
          {temperature.factors.map((factor, index) => (
            <div key={index} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span>{factor.name}</span>
                <span className="font-medium">{factor.value}/{factor.maxValue}</span>
              </div>
              <Progress 
                value={(factor.value / factor.maxValue) * 100} 
                className="h-1"
              />
              <p className="text-[10px] text-muted-foreground">{factor.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Simplified temperature indicator for lists
export function TemperatureIndicator({ 
  score, 
  className 
}: { 
  score: number;
  className?: string;
}) {
  const state = score <= 30 ? "cold" : score <= 60 ? "warm" : "hot";
  const config = temperatureConfig[state];
  const StateIcon = stateIcons[state];

  return (
    <div className={cn(
      "flex items-center gap-1 text-xs",
      config.color,
      className
    )}>
      <StateIcon className="w-3 h-3" />
      <span className="font-medium">{score}</span>
    </div>
  );
}
