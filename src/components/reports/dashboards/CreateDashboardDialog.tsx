import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

interface CreateDashboardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { name: string; description?: string }) => void;
  isLoading?: boolean;
}

export function CreateDashboardDialog({ open, onOpenChange, onSubmit, isLoading }: CreateDashboardDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), description: description.trim() || undefined });
    setName("");
    setDescription("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Dashboard</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Sales Performance" />
          </div>
          <div>
            <Label>Descrição (opcional)</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descreva este dashboard..." rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || isLoading}>Criar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
