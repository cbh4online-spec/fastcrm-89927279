import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Archive, Ban } from "lucide-react";

interface EntityStatusBadgesProps {
  isBlocked?: boolean | null;
  blockReason?: string | null;
  archivedAt?: string | null;
  archiveReason?: string | null;
  size?: "sm" | "md";
}

export function EntityStatusBadges({
  isBlocked,
  blockReason,
  archivedAt,
  archiveReason,
  size = "md",
}: EntityStatusBadgesProps) {
  if (!isBlocked && !archivedAt) return null;
  const cls = size === "sm" ? "h-5 gap-1 px-1.5 text-[10px]" : "gap-1";

  return (
    <>
      {isBlocked && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="destructive" className={cls}>
              <Ban className="h-3 w-3" />
              Bloqueado
            </Badge>
          </TooltipTrigger>
          <TooltipContent>{blockReason || "Interações desativadas"}</TooltipContent>
        </Tooltip>
      )}
      {archivedAt && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="secondary" className={cls}>
              <Archive className="h-3 w-3" />
              Arquivado
            </Badge>
          </TooltipTrigger>
          <TooltipContent>{archiveReason || "Fora das listas de ativos"}</TooltipContent>
        </Tooltip>
      )}
    </>
  );
}
