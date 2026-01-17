import { AlertTriangle, CheckCircle, TrendingDown, TrendingUp, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface PriceValidationIndicatorProps {
  currentPrice: number;
  marketMin?: number;
  marketMax?: number;
  suggestedPrice?: number;
  className?: string;
}

type PriceStatus = "excellent" | "good" | "below" | "above" | "warning" | "unknown";

function analyzePricePosition(
  currentPrice: number,
  marketMin?: number,
  marketMax?: number,
  suggestedPrice?: number
): { status: PriceStatus; message: string; percentDiff: number } {
  if (!marketMin && !marketMax && !suggestedPrice) {
    return { status: "unknown", message: "Sem dados de mercado disponíveis", percentDiff: 0 };
  }

  // If we have a range
  if (marketMin && marketMax && marketMin > 0 && marketMax > 0) {
    const range = marketMax - marketMin;
    const midpoint = (marketMin + marketMax) / 2;
    
    // Far below market (< 70% of min)
    if (currentPrice < marketMin * 0.7) {
      const percentDiff = ((marketMin - currentPrice) / marketMin) * 100;
      return {
        status: "warning",
        message: `Preço muito abaixo do mercado (-${percentDiff.toFixed(0)}%)`,
        percentDiff: -percentDiff,
      };
    }
    
    // Below market but close (70-95% of min)
    if (currentPrice < marketMin * 0.95) {
      const percentDiff = ((marketMin - currentPrice) / marketMin) * 100;
      return {
        status: "below",
        message: `Preço abaixo do mercado (-${percentDiff.toFixed(0)}%)`,
        percentDiff: -percentDiff,
      };
    }
    
    // Within market range
    if (currentPrice >= marketMin * 0.95 && currentPrice <= marketMax * 1.05) {
      if (currentPrice <= midpoint) {
        return {
          status: "excellent",
          message: "Preço competitivo dentro do mercado",
          percentDiff: 0,
        };
      } else {
        return {
          status: "good",
          message: "Preço dentro do range de mercado",
          percentDiff: 0,
        };
      }
    }
    
    // Above market but close (105-130% of max)
    if (currentPrice > marketMax && currentPrice <= marketMax * 1.3) {
      const percentDiff = ((currentPrice - marketMax) / marketMax) * 100;
      return {
        status: "above",
        message: `Preço acima do mercado (+${percentDiff.toFixed(0)}%)`,
        percentDiff,
      };
    }
    
    // Far above market (> 130% of max)
    if (currentPrice > marketMax * 1.3) {
      const percentDiff = ((currentPrice - marketMax) / marketMax) * 100;
      return {
        status: "warning",
        message: `Preço muito acima do mercado (+${percentDiff.toFixed(0)}%)`,
        percentDiff,
      };
    }
  }

  // If we only have suggested price
  if (suggestedPrice && suggestedPrice > 0) {
    const percentDiff = ((currentPrice - suggestedPrice) / suggestedPrice) * 100;
    
    if (Math.abs(percentDiff) <= 15) {
      return {
        status: "good",
        message: "Preço próximo ao sugerido",
        percentDiff,
      };
    } else if (percentDiff < -30) {
      return {
        status: "warning",
        message: `Preço muito abaixo do sugerido (${percentDiff.toFixed(0)}%)`,
        percentDiff,
      };
    } else if (percentDiff < 0) {
      return {
        status: "below",
        message: `Preço abaixo do sugerido (${percentDiff.toFixed(0)}%)`,
        percentDiff,
      };
    } else if (percentDiff > 30) {
      return {
        status: "warning",
        message: `Preço muito acima do sugerido (+${percentDiff.toFixed(0)}%)`,
        percentDiff,
      };
    } else {
      return {
        status: "above",
        message: `Preço acima do sugerido (+${percentDiff.toFixed(0)}%)`,
        percentDiff,
      };
    }
  }

  return { status: "unknown", message: "Sem dados suficientes para análise", percentDiff: 0 };
}

export function PriceValidationIndicator({
  currentPrice,
  marketMin,
  marketMax,
  suggestedPrice,
  className,
}: PriceValidationIndicatorProps) {
  const { status, message, percentDiff } = analyzePricePosition(
    currentPrice,
    marketMin,
    marketMax,
    suggestedPrice
  );

  if (status === "unknown" || currentPrice <= 0) {
    return null;
  }

  const getStatusConfig = () => {
    switch (status) {
      case "excellent":
        return {
          icon: CheckCircle,
          bgColor: "bg-green-100 dark:bg-green-900/30",
          textColor: "text-green-700 dark:text-green-400",
          borderColor: "border-green-200 dark:border-green-800",
        };
      case "good":
        return {
          icon: CheckCircle,
          bgColor: "bg-blue-100 dark:bg-blue-900/30",
          textColor: "text-blue-700 dark:text-blue-400",
          borderColor: "border-blue-200 dark:border-blue-800",
        };
      case "below":
        return {
          icon: TrendingDown,
          bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
          textColor: "text-yellow-700 dark:text-yellow-400",
          borderColor: "border-yellow-200 dark:border-yellow-800",
        };
      case "above":
        return {
          icon: TrendingUp,
          bgColor: "bg-orange-100 dark:bg-orange-900/30",
          textColor: "text-orange-700 dark:text-orange-400",
          borderColor: "border-orange-200 dark:border-orange-800",
        };
      case "warning":
        return {
          icon: AlertTriangle,
          bgColor: "bg-red-100 dark:bg-red-900/30",
          textColor: "text-red-700 dark:text-red-400",
          borderColor: "border-red-200 dark:border-red-800",
        };
      default:
        return {
          icon: Info,
          bgColor: "bg-muted",
          textColor: "text-muted-foreground",
          borderColor: "border-muted",
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs border cursor-help",
              config.bgColor,
              config.textColor,
              config.borderColor,
              className
            )}
          >
            <Icon className="h-3 w-3" />
            <span className="font-medium">
              {status === "excellent" && "Competitivo"}
              {status === "good" && "OK"}
              {status === "below" && "Baixo"}
              {status === "above" && "Alto"}
              {status === "warning" && "Atenção"}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium">{message}</p>
            {marketMin && marketMax && marketMin > 0 && marketMax > 0 && (
              <p className="text-xs text-muted-foreground">
                Range de mercado: €{marketMin.toFixed(2)} - €{marketMax.toFixed(2)}
              </p>
            )}
            {suggestedPrice && suggestedPrice > 0 && (
              <p className="text-xs text-muted-foreground">
                Preço sugerido: €{suggestedPrice.toFixed(2)}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Seu preço: €{currentPrice.toFixed(2)}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
