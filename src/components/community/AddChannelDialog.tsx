import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Hash } from "lucide-react";
import { useCreateForumCategory } from "@/hooks/useForumMutations";

interface AddChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string | undefined;
}

export function AddChannelDialog({ open, onOpenChange, workspaceId }: AddChannelDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("💬");
  const [isPrivate, setIsPrivate] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);

  const createCategory = useCreateForumCategory(workspaceId);

  const handleSubmit = () => {
    if (!name.trim()) return;
    createCategory.mutate(
      { name: name.trim(), description: description.trim() || null, icon, isPrivate, isReadOnly },
      {
        onSuccess: () => {
          setName("");
          setDescription("");
          setIcon("💬");
          setIsPrivate(false);
          setIsReadOnly(false);
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5" /> Adicionar Canal
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Ícone</Label>
            <Input value={icon} onChange={e => setIcon(e.target.value)} maxLength={2} className="w-20 text-center text-xl" />
          </div>

          <div className="space-y-2">
            <Label>Nome do Canal</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: geral" maxLength={25} />
            <p className="text-[11px] text-muted-foreground">{name.length}/25 caracteres</p>
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Breve descrição do canal..." maxLength={60} rows={2} />
            <p className="text-[11px] text-muted-foreground">{description.length}/60 caracteres</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <p className="text-sm font-medium">Canal Privado</p>
                <p className="text-xs text-muted-foreground">Apenas membros convidados vêem este canal</p>
              </div>
              <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <p className="text-sm font-medium">Só de Leitura</p>
                <p className="text-xs text-muted-foreground">Apenas admins podem publicar</p>
              </div>
              <Switch checked={isReadOnly} onCheckedChange={setIsReadOnly} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || createCategory.isPending} className="gap-1.5">
            {createCategory.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Criar Canal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
