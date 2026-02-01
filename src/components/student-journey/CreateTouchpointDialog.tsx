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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTouchpoints } from "@/hooks/useStudentJourney";
import { TouchpointType, TouchpointOutcome, TOUCHPOINT_TYPE_CONFIG } from "@/types/studentJourney";
import { Loader2 } from "lucide-react";

interface CreateTouchpointDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileId?: string;
  enrollmentId?: string;
}

export function CreateTouchpointDialog({
  open,
  onOpenChange,
  profileId,
  enrollmentId,
}: CreateTouchpointDialogProps) {
  const { createTouchpoint } = useTouchpoints(profileId);

  const [type, setType] = useState<TouchpointType>("note");
  const [outcome, setOutcome] = useState<TouchpointOutcome | "">("");
  const [message, setMessage] = useState("");
  const [nextAction, setNextAction] = useState("");

  const resetForm = () => {
    setType("note");
    setOutcome("");
    setMessage("");
    setNextAction("");
  };

  const handleSubmit = async () => {
    if (!profileId) return;

    await createTouchpoint.mutateAsync({
      profile_id: profileId,
      enrollment_id: enrollmentId,
      touchpoint_type: type,
      outcome: outcome || undefined,
      message_preview: message.trim() || undefined,
      next_action: nextAction.trim() || undefined,
    });

    resetForm();
    onOpenChange(false);
  };

  const touchpointTypes = Object.entries(TOUCHPOINT_TYPE_CONFIG);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registar Interação</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-2">
            <Label>Tipo *</Label>
            <Select value={type} onValueChange={(v) => setType(v as TouchpointType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {touchpointTypes.map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Resultado</Label>
            <Select value={outcome || "none"} onValueChange={(v) => setOutcome(v === "none" ? "" : v as TouchpointOutcome)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem resultado específico</SelectItem>
                <SelectItem value="no_answer">Sem Resposta</SelectItem>
                <SelectItem value="interested">Interessado</SelectItem>
                <SelectItem value="needs_follow_up">Precisa Follow-up</SelectItem>
                <SelectItem value="enrolled">Inscreveu-se</SelectItem>
                <SelectItem value="completed">Concluído</SelectItem>
                <SelectItem value="churn_risk">Risco de Churn</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Resumo / Notas</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Descreva a interação..."
              rows={3}
            />
          </div>

          <div className="grid gap-2">
            <Label>Próxima Ação</Label>
            <Input
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
              placeholder="Ex: Ligar na próxima semana"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={createTouchpoint.isPending}>
            {createTouchpoint.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Registar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
