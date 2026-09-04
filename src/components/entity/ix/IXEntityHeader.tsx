import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MoreHorizontal, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { EditableEntityTitle } from "@/components/entity/EditableEntityTitle";

export interface IXHeaderAction {
  id: string;
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

interface IXEntityHeaderProps {
  backTo?: string;
  avatar?: ReactNode;
  title: string;
  /** Quando definido, o título passa a ser editável em linha. */
  onTitleSave?: (name: string) => Promise<void> | void;
  status?: { label: string; tone?: "neutral" | "info" | "warning" | "success" | "danger" };
  metaItems?: { label: string; value?: ReactNode }[];
  updatedAgo?: string;
  primaryAction?: { label: string; icon?: ReactNode; onClick: () => void; loading?: boolean };
  secondaryActions?: IXHeaderAction[];
  rightExtras?: ReactNode;
}

const TONE: Record<string, string> = {
  neutral: "bg-muted text-foreground border-border",
  info: "bg-primary/10 text-primary border-primary/20",
  warning: "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400",
  success: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400",
  danger: "bg-destructive/10 text-destructive border-destructive/20",
};

export function IXEntityHeader({
  backTo,
  avatar,
  title,
  onTitleSave,
  status,
  metaItems = [],
  updatedAgo,
  primaryAction,
  secondaryActions = [],
  rightExtras,
}: IXEntityHeaderProps) {
  const navigate = useNavigate();
  const visibleMeta = metaItems.filter((m) => m.value);

  return (
    <div className="px-4 sm:px-8 pt-6 pb-5 bg-background">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => (backTo ? navigate(backTo) : navigate(-1))}
            className="shrink-0 mt-1 h-9 w-9 rounded-full hover:bg-muted"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          {avatar && <div className="shrink-0">{avatar}</div>}
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex items-center gap-3 flex-wrap">
              {onTitleSave ? (
                <EditableEntityTitle value={title} onSave={onTitleSave} className="sm:text-3xl" />
              ) : (
                <h1 className="text-3xl font-bold tracking-tight text-foreground truncate">{title}</h1>
              )}
              {status && (
                <Badge
                  variant="outline"
                  className={cn("rounded-full px-3 py-0.5 text-xs font-medium", TONE[status.tone ?? "neutral"])}
                >
                  {status.label}
                </Badge>
              )}
            </div>
            {(visibleMeta.length > 0 || updatedAgo) && (
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {visibleMeta.map((m, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5">
                    {i > 0 && <span className="text-muted-foreground/40">·</span>}
                    <span className="text-muted-foreground/70">{m.label}:</span>
                    <span className="text-foreground/80">{m.value}</span>
                  </span>
                ))}
                {updatedAgo && (
                  <span className="inline-flex items-center gap-1.5">
                    {visibleMeta.length > 0 && <span className="text-muted-foreground/40">·</span>}
                    <Clock className="w-3 h-3" /> Atualizado há {updatedAgo}
                  </span>
                )}
              </div>
            )}
            {rightExtras && <div className="mt-3">{rightExtras}</div>}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {primaryAction && (
            <Button
              onClick={primaryAction.onClick}
              disabled={primaryAction.loading}
              className="h-10 gap-2 rounded-full px-5 font-semibold"
            >
              {primaryAction.icon}
              <span className="hidden sm:inline">{primaryAction.label}</span>
            </Button>
          )}
          {secondaryActions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-full border-border bg-card"
                  aria-label="Mais ações"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {secondaryActions.map((action, idx) => {
                  const prev = secondaryActions[idx - 1];
                  const needsSep = action.destructive && prev && !prev.destructive;
                  return (
                    <div key={action.id}>
                      {needsSep && <DropdownMenuSeparator />}
                      <DropdownMenuItem
                        onClick={action.onClick}
                        disabled={action.disabled}
                        className={cn(action.destructive && "text-destructive focus:text-destructive")}
                      >
                        {action.icon && <span className="mr-2">{action.icon}</span>}
                        {action.label}
                      </DropdownMenuItem>
                    </div>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </div>
  );
}
