import { Brain } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { useContextScore } from "@/hooks/useContextScore";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function ContextScoreIndicator() {
  const { data } = useBusinessContext();
  const { globalScore } = useContextScore(data);
  const navigate = useNavigate();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={() => navigate("/dashboard/context-os")}
          className={cn(
            "flex items-center gap-1 h-9 px-2 rounded-md text-xs font-semibold transition-colors hover:bg-muted",
            globalScore >= 80 ? "text-emerald-500" : globalScore >= 50 ? "text-amber-500" : "text-destructive"
          )}
        >
          <Brain className="h-3.5 w-3.5" />
          <span>{globalScore}%</span>
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">Context Score — quanto mais completo, mais inteligente fica a IA</p>
      </TooltipContent>
    </Tooltip>
  );
}
