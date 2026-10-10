import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  describeProspectingIdentity,
  prospectingIdentityHref,
  prospectingIdentityLabel,
  type ProspectingIdentityCheck,
} from "@/lib/prospecting/identity";

const toneClass = {
  new: "border-transparent bg-secondary text-secondary-foreground",
  info: "border-primary/40 bg-primary/10 text-primary",
  warning: "border-accent bg-accent text-accent-foreground",
  danger: "border-transparent bg-destructive text-destructive-foreground",
  muted: "border-border bg-muted text-muted-foreground",
} as const;

interface Props {
  check: ProspectingIdentityCheck | undefined;
  loading?: boolean;
  className?: string;
}

/** Visible CRM identity for a prospecting result, with a link to the existing record. */
export function ProspectingIdentityBadge({ check, loading, className }: Props) {
  if (loading && !check) {
    return <Badge variant="outline" className={cn("text-[10px]", className)}>A verificar…</Badge>;
  }
  if (!check) return null;
  const { label, tone } = prospectingIdentityLabel(check);
  const description = describeProspectingIdentity(check);
  const href = check.status === "new" ? null : prospectingIdentityHref(check);
  const badge = (
    <Badge variant="outline" className={cn("text-[10px] whitespace-nowrap", toneClass[tone], className)}>
      {label}
    </Badge>
  );
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {href ? (
          <Link
            to={href}
            className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`${label}: ${description} Abrir registo`}
          >
            {badge}
          </Link>
        ) : (
          <span tabIndex={0} aria-label={`${label}: ${description}`} className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {badge}
          </span>
        )}
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-xs">{description}</TooltipContent>
    </Tooltip>
  );
}
