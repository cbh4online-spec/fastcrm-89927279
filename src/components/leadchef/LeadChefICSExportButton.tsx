import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import { downloadICSFile } from "@/utils/leadchef/ics";
import { toast } from "sonner";

interface Props {
  appointment: {
    id?: string;
    title?: string | null;
    notes?: string | null;
    location?: string | null;
    scheduled_at: string;
    duration_minutes?: number | null;
  };
  size?: "sm" | "default";
  variant?: "outline" | "ghost" | "default";
}

export function LeadChefICSExportButton({ appointment, size = "sm", variant = "outline" }: Props) {
  function handle() {
    try {
      downloadICSFile(`leadchef-${appointment.id ?? "compromisso"}`, {
        uid: appointment.id,
        title: appointment.title ?? "Compromisso LeadChef",
        description: appointment.notes ?? undefined,
        location: appointment.location ?? undefined,
        startISO: appointment.scheduled_at,
        durationMinutes: appointment.duration_minutes ?? 60,
      });
    } catch {
      toast.error("Não foi possível gerar o ficheiro .ics.");
    }
  }
  return (
    <Button size={size} variant={variant} onClick={handle}>
      <Calendar className="h-3 w-3 mr-1" />
      Adicionar ao calendário
    </Button>
  );
}
