import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useRegisterAction } from "../hooks/useRegisterAction";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
}

export function AddNoteDialog({ open, onOpenChange, caseId }: Props) {
  const [text, setText] = useState("");
  const mutation = useRegisterAction();

  const handleSubmit = async () => {
    if (!text.trim()) return;
    await mutation.mutateAsync({ caseId, actionType: "note", body: text.trim() });
    setText("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setText(""); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar nota</DialogTitle>
        </DialogHeader>
        <Textarea
          rows={5}
          placeholder="Escreva uma nota interna sobre este caso…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!text.trim() || mutation.isPending}>
            {mutation.isPending ? "A guardar…" : "Guardar nota"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
