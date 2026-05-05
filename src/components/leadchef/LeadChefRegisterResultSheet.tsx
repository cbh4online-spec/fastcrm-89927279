import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LEADCHEF_ACTIVITY_LABELS } from "./constants";
import { useCreateLeadChefActivity } from "@/hooks/leadchef/useCreateLeadChefActivity";
import { useUpdateLeadChefNextAction } from "@/hooks/leadchef/useUpdateLeadChefNextAction";
import { useUpdateLeadChefLeadStage } from "@/hooks/leadchef/useUpdateLeadChefLeadStage";
import type { LeadChefActivityType, LeadChefStage } from "@/types/leadchef";

const CONTACT_TYPES: LeadChefActivityType[] = [
  "phone_call",
  "whatsapp",
  "follow_up",
  "demo",
  "proposal",
  "note",
];

type Result =
  | "no_answer"
  | "interested"
  | "scheduled_demo"
  | "asked_info"
  | "proposal_sent"
  | "won"
  | "not_interested"
  | "reschedule";

const RESULT_LABELS: Record<Result, string> = {
  no_answer: "Sem resposta",
  interested: "Interessado",
  scheduled_demo: "Marcou demonstração",
  asked_info: "Pediu informação",
  proposal_sent: "Proposta enviada",
  won: "Venda ganha",
  not_interested: "Sem interesse",
  reschedule: "Reagendar",
};

const RESULT_TO_STAGE: Partial<Record<Result, LeadChefStage>> = {
  scheduled_demo: "demo_scheduled",
  proposal_sent: "proposal_decision",
  won: "won",
  not_interested: "lost",
};

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  leadId: string;
  profileId: string;
}

export function LeadChefRegisterResultSheet({
  open,
  onOpenChange,
  leadId,
  profileId,
}: Props) {
  const [type, setType] = useState<LeadChefActivityType>("phone_call");
  const [result, setResult] = useState<Result>("interested");
  const [note, setNote] = useState("");
  const [nextAt, setNextAt] = useState("");
  const [nextType, setNextType] = useState<LeadChefActivityType>("follow_up");

  const create = useCreateLeadChefActivity();
  const updateNext = useUpdateLeadChefNextAction();
  const updateStage = useUpdateLeadChefLeadStage();

  useEffect(() => {
    if (open) {
      setType("phone_call");
      setResult("interested");
      setNote("");
      setNextAt("");
      setNextType("follow_up");
    }
  }, [open]);

  const submit = async () => {
    await create.mutateAsync({
      leadId,
      type,
      title: `${LEADCHEF_ACTIVITY_LABELS[type]} — ${RESULT_LABELS[result]}`,
      description: note || undefined,
      metadata: { result: RESULT_LABELS[result] },
    });

    if (nextAt) {
      await updateNext.mutateAsync({
        profileId,
        next_action_type: nextType,
        next_action_at: new Date(nextAt).toISOString(),
        next_action_note: null,
      });
    }

    const newStage = RESULT_TO_STAGE[result];
    if (newStage) {
      await updateStage.mutateAsync({ profileId, leadId, stage: newStage });
    }

    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Registar resultado</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          <div>
            <Label>Tipo de contacto</Label>
            <Select value={type} onValueChange={(v) => setType(v as LeadChefActivityType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CONTACT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {LEADCHEF_ACTIVITY_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Resultado</Label>
            <Select value={result} onValueChange={(v) => setResult(v as Result)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.keys(RESULT_LABELS).map((r) => (
                  <SelectItem key={r} value={r}>{RESULT_LABELS[r as Result]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Nota</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="O que aconteceu neste contacto?"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Próxima ação</Label>
              <Select
                value={nextType}
                onValueChange={(v) => setNextType(v as LeadChefActivityType)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONTACT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {LEADCHEF_ACTIVITY_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quando</Label>
              <Input
                type="datetime-local"
                value={nextAt}
                onChange={(e) => setNextAt(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={submit}
              disabled={create.isPending || updateStage.isPending}
            >
              Guardar
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
