import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Search, Users } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function ProspectingUsage() {
  const { currentWorkspace } = useWorkspace();

  const { data: usage } = useQuery({
    queryKey: ["prospecting-usage", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return null;
      const { data, error } = await supabase.rpc("get_or_create_prospecting_usage", {
        p_workspace_id: currentWorkspace.id,
      });
      if (error) throw error;
      return data;
    },
    enabled: !!currentWorkspace?.id,
  });

  if (!usage) return null;

  const searchPercent = (usage.searches_count / usage.searches_limit) * 100;
  const profilePercent = (usage.profiles_analyzed_count / usage.profiles_analyzed_limit) * 100;

  return (
    <TooltipProvider>
      <div className="flex items-center gap-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 cursor-help">
              <Search className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {usage.searches_count}/{usage.searches_limit}
              </span>
              <Progress value={searchPercent} className="w-16 h-2" />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{usage.searches_count} pesquisas de {usage.searches_limit} usadas este mês</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 cursor-help">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {usage.profiles_analyzed_count}/{usage.profiles_analyzed_limit}
              </span>
              <Progress value={profilePercent} className="w-16 h-2" />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{usage.profiles_analyzed_count} perfis de {usage.profiles_analyzed_limit} analisados este mês</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
