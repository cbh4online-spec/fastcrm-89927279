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
import { Bookmark } from "lucide-react";

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
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Bookmark className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Guardar esta vista</DialogTitle>
              <DialogDescription className="text-sm mt-1">
                Guarde os filtros, colunas e modo de visualização atuais para aceder rapidamente no futuro.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Dê um nome à sua vista</Label>
            <Input
              id="name"
              placeholder="Ex: Negócios prioritários, Contactos recentes..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim()) {
                  handleSave();
                }
              }}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Escolha um nome que descreva o tipo de dados que vai ver
            </p>
          </div>
          <div className="flex items-start space-x-3 bg-muted/50 p-3 rounded-lg">
            <Checkbox
              id="default"
              checked={isDefault}
              onCheckedChange={(checked) => setIsDefault(checked === true)}
              className="mt-0.5"
            />
            <div>
              <Label htmlFor="default" className="text-sm font-medium cursor-pointer">
                Usar como vista inicial
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Esta vista será carregada automaticamente quando abrir o CRM
              </p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || isLoading}>
            {isLoading ? "A guardar..." : "Guardar vista"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
