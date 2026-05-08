import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  LEADCHEF_APPOINTMENT_TYPE_LABELS,
  LEADCHEF_APPOINTMENT_TYPE_COLORS,
} from "./constants";
import type { LeadChefAppointmentType } from "@/types/leadchef";

export function LeadChefAppointmentTypeBadge({
  type,
  className,
}: {
  type: LeadChefAppointmentType;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn("font-medium border", LEADCHEF_APPOINTMENT_TYPE_COLORS[type], className)}
    >
      {LEADCHEF_APPOINTMENT_TYPE_LABELS[type]}
    </Badge>
  );
}
