import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  LEADCHEF_APPOINTMENT_STATUS_LABELS,
  LEADCHEF_APPOINTMENT_STATUS_COLORS,
} from "./constants";
import type { LeadChefAppointmentStatus } from "@/types/leadchef";

export function LeadChefAppointmentStatusBadge({
  status,
  className,
}: {
  status: LeadChefAppointmentStatus;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn("font-medium border", LEADCHEF_APPOINTMENT_STATUS_COLORS[status], className)}
    >
      {LEADCHEF_APPOINTMENT_STATUS_LABELS[status]}
    </Badge>
  );
}
