import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { 
  Flame, 
  Thermometer, 
  Snowflake,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Trophy,
  TrendingUp,
  Target
} from "lucide-react";

// ============================================
// STATUS BADGE - Semantic Status Indicators
// ============================================

type LeadStatus = "new" | "in_progress" | "completed";
type OpportunityStage = "prospecting" | "qualification" | "proposal" | "negotiation" | "won" | "lost";
type Temperature = "hot" | "warm" | "cold";
type TaskStatus = "pending" | "in_progress" | "completed" | "overdue";

interface StatusBadgeBaseProps {
  className?: string;
  showIcon?: boolean;
  size?: "sm" | "md" | "lg";
}

// Lead Status Badge
interface LeadStatusBadgeProps extends StatusBadgeBaseProps {
  status: LeadStatus;
}

const leadStatusConfig: Record<LeadStatus, { label: string; variant: string; icon: typeof Clock }> = {
  new: { label: "Novo", variant: "bg-info/10 text-info border-info/20", icon: AlertCircle },
  in_progress: { label: "Em Progresso", variant: "bg-warning/10 text-warning border-warning/20", icon: Clock },
  completed: { label: "Concluído", variant: "bg-success/10 text-success border-success/20", icon: CheckCircle2 },
};

export function LeadStatusBadge({ status, className, showIcon = true, size = "md" }: LeadStatusBadgeProps) {
  const config = leadStatusConfig[status];
  const Icon = config.icon;
  
  const sizeClasses = {
    sm: "text-[10px] px-1.5 py-0.5",
    md: "text-xs px-2 py-0.5",
    lg: "text-sm px-3 py-1",
  };
  
  return (
    <Badge 
      variant="outline" 
      className={cn(config.variant, sizeClasses[size], "gap-1 font-medium", className)}
    >
      {showIcon && <Icon className={cn(size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5")} />}
      {config.label}
    </Badge>
  );
}

// Temperature Badge
interface TemperatureBadgeProps extends StatusBadgeBaseProps {
  temperature: Temperature;
}

const temperatureConfig: Record<Temperature, { label: string; variant: string; icon: typeof Flame }> = {
  hot: { label: "Quente", variant: "bg-destructive/10 text-destructive border-destructive/20", icon: Flame },
  warm: { label: "Morno", variant: "bg-warning/10 text-warning border-warning/20", icon: Thermometer },
  cold: { label: "Frio", variant: "bg-info/10 text-info border-info/20", icon: Snowflake },
};

export function TemperatureBadge({ temperature, className, showIcon = true, size = "md" }: TemperatureBadgeProps) {
  const config = temperatureConfig[temperature];
  const Icon = config.icon;
  
  const sizeClasses = {
    sm: "text-[10px] px-1.5 py-0.5",
    md: "text-xs px-2 py-0.5",
    lg: "text-sm px-3 py-1",
  };
  
  return (
    <Badge 
      variant="outline" 
      className={cn(config.variant, sizeClasses[size], "gap-1 font-medium", className)}
    >
      {showIcon && <Icon className={cn(size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5")} />}
      {config.label}
    </Badge>
  );
}

// Opportunity Stage Badge
interface OpportunityStageBadgeProps extends StatusBadgeBaseProps {
  stage: OpportunityStage;
}

const opportunityStageConfig: Record<OpportunityStage, { label: string; variant: string; icon: typeof Target }> = {
  prospecting: { label: "Prospecção", variant: "bg-muted text-muted-foreground border-border", icon: Target },
  qualification: { label: "Qualificação", variant: "bg-info/10 text-info border-info/20", icon: TrendingUp },
  proposal: { label: "Proposta", variant: "bg-primary/10 text-primary border-primary/20", icon: TrendingUp },
  negotiation: { label: "Negociação", variant: "bg-warning/10 text-warning border-warning/20", icon: TrendingUp },
  won: { label: "Ganho", variant: "bg-success/10 text-success border-success/20", icon: Trophy },
  lost: { label: "Perdido", variant: "bg-destructive/10 text-destructive border-destructive/20", icon: XCircle },
};

export function OpportunityStageBadge({ stage, className, showIcon = true, size = "md" }: OpportunityStageBadgeProps) {
  const config = opportunityStageConfig[stage];
  const Icon = config.icon;
  
  const sizeClasses = {
    sm: "text-[10px] px-1.5 py-0.5",
    md: "text-xs px-2 py-0.5",
    lg: "text-sm px-3 py-1",
  };
  
  return (
    <Badge 
      variant="outline" 
      className={cn(config.variant, sizeClasses[size], "gap-1 font-medium", className)}
    >
      {showIcon && <Icon className={cn(size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5")} />}
      {config.label}
    </Badge>
  );
}

// Task Status Badge
interface TaskStatusBadgeProps extends StatusBadgeBaseProps {
  status: TaskStatus;
}

const taskStatusConfig: Record<TaskStatus, { label: string; variant: string; icon: typeof Clock }> = {
  pending: { label: "Pendente", variant: "bg-muted text-muted-foreground border-border", icon: Clock },
  in_progress: { label: "Em Andamento", variant: "bg-info/10 text-info border-info/20", icon: Clock },
  completed: { label: "Concluída", variant: "bg-success/10 text-success border-success/20", icon: CheckCircle2 },
  overdue: { label: "Atrasada", variant: "bg-destructive/10 text-destructive border-destructive/20", icon: AlertCircle },
};

export function TaskStatusBadge({ status, className, showIcon = true, size = "md" }: TaskStatusBadgeProps) {
  const config = taskStatusConfig[status];
  const Icon = config.icon;
  
  const sizeClasses = {
    sm: "text-[10px] px-1.5 py-0.5",
    md: "text-xs px-2 py-0.5",
    lg: "text-sm px-3 py-1",
  };
  
  return (
    <Badge 
      variant="outline" 
      className={cn(config.variant, sizeClasses[size], "gap-1 font-medium", className)}
    >
      {showIcon && <Icon className={cn(size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5")} />}
      {config.label}
    </Badge>
  );
}

// Generic Status Badge for custom statuses
interface GenericStatusBadgeProps extends StatusBadgeBaseProps {
  label: string;
  variant?: "default" | "success" | "warning" | "destructive" | "info" | "muted";
  icon?: React.ReactNode;
}

const variantStyles = {
  default: "bg-primary/10 text-primary border-primary/20",
  success: "bg-success/10 text-success border-success/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  destructive: "bg-destructive/10 text-destructive border-destructive/20",
  info: "bg-info/10 text-info border-info/20",
  muted: "bg-muted text-muted-foreground border-border",
};

export function StatusBadge({ label, variant = "default", icon, className, size = "md" }: GenericStatusBadgeProps) {
  const sizeClasses = {
    sm: "text-[10px] px-1.5 py-0.5",
    md: "text-xs px-2 py-0.5",
    lg: "text-sm px-3 py-1",
  };
  
  return (
    <Badge 
      variant="outline" 
      className={cn(variantStyles[variant], sizeClasses[size], "gap-1 font-medium", className)}
    >
      {icon}
      {label}
    </Badge>
  );
}

// Export all for convenience
export const StatusBadges = {
  Lead: LeadStatusBadge,
  Temperature: TemperatureBadge,
  Opportunity: OpportunityStageBadge,
  Task: TaskStatusBadge,
  Generic: StatusBadge,
};
