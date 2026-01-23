import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProfiles } from "@/hooks/useStudentJourney";
import { Loader2, Calendar } from "lucide-react";
import { format, addDays, addHours } from "date-fns";

interface ScheduleFollowUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileId: string | null;
}

export function ScheduleFollowUpDialog({
  open,
  onOpenChange,
  profileId,
}: ScheduleFollowUpDialogProps) {
  const { updateProfile } = useProfiles();
  const [dateTime, setDateTime] = useState(
    format(addDays(new Date(), 1), "yyyy-MM-dd'T'10:00")
  );

  const quickOptions = [
    { label: "Hoje +2h", getValue: () => addHours(new Date(), 2) },
    { label: "Amanhã 10h", getValue: () => { const d = addDays(new Date(), 1); d.setHours(10, 0, 0, 0); return d; } },
    { label: "Em 3 dias", getValue: () => { const d = addDays(new Date(), 3); d.setHours(10, 0, 0, 0); return d; } },
    { label: "Em 1 semana", getValue: () => { const d = addDays(new Date(), 7); d.setHours(10, 0, 0, 0); return d; } },
  ];

  const handleSubmit = async () => {
    if (!profileId) return;

    await updateProfile.mutateAsync({
      id: profileId,
      next_follow_up_at: new Date(dateTime).toISOString(),
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Agendar Follow-up
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {quickOptions.map((option) => (
              <Button
                key={option.label}
                variant="outline"
                size="sm"
                onClick={() => setDateTime(format(option.getValue(), "yyyy-MM-dd'T'HH:mm"))}
              >
                {option.label}
              </Button>
            ))}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="datetime">Data e Hora</Label>
            <Input
              id="datetime"
              type="datetime-local"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={updateProfile.isPending}>
            {updateProfile.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Agendar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
