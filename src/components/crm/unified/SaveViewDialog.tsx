import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface SaveViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string, isDefault: boolean) => Promise<void>;
  isLoading: boolean;
}

export function SaveViewDialog({
  open,
  onOpenChange,
  onSave,
  isLoading,
}: SaveViewDialogProps) {
  const [name, setName] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    await onSave(name.trim(), isDefault);
    setName("");
    setIsDefault(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Guardar Vista</DialogTitle>
          <DialogDescription>
            Guarde a configuração atual (filtros, colunas, modo de visualização) como uma vista personalizada.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Nome da Vista</Label>
            <Input
              id="name"
              placeholder="Ex: Contactos Ativos"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="default"
              checked={isDefault}
              onCheckedChange={(checked) => setIsDefault(checked === true)}
            />
            <Label htmlFor="default" className="text-sm font-normal">
              Definir como vista padrão
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || isLoading}>
            {isLoading ? "A guardar..." : "Guardar Vista"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
