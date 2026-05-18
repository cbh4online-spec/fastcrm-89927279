import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDunningSequences, useAssignSequence } from "../hooks/useDunningSequences";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  caseId: string;
  currentSequenceId?: string | null;
}

export function AssignSequenceDialog({ open, onOpenChange, caseId, currentSequenceId }: Props) {
  const { data: sequences = [] } = useDunningSequences();
  const assign = useAssignSequence();
  const [value, setValue] = useState<string>(currentSequenceId ?? "");

  useEffect(() => { setValue(currentSequenceId ?? ""); }, [currentSequenceId, open]);

  const submit = () => {
    if (!value) return;
    assign.mutate({ caseId, sequenceId: value }, { onSuccess: () => onOpenChange(false) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Atribuir sequência de dunning</DialogTitle></DialogHeader>
        <div className="space-y-2 py-2">
          <Label>Sequência</Label>
          <Select value={value} onValueChange={setValue}>
            <SelectTrigger><SelectValue placeholder="Escolher sequência" /></SelectTrigger>
            <SelectContent>
              {sequences.filter((s) => s.is_active).map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name} ({s.steps.length} passos){s.is_default ? " · padrão" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {sequences.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Sem sequências criadas. Vai a Cobranças → Sequências para criar uma.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={!value || assign.isPending}>Atribuir</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
