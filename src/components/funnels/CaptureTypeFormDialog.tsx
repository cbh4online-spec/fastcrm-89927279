import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useCreateCaptureType, useUpdateCaptureType, type CaptureType } from "@/hooks/useFunnelInstances";
import {
  Target, Mail, Phone, Calendar, MessageSquare, FileText, Users, Zap,
  ShoppingCart, CreditCard, Globe, Play, Headphones, Star, Heart,
  Download, Send, BookOpen, Clipboard, Search, Bell, Gift, Award
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ICON_OPTIONS: { name: string; icon: LucideIcon }[] = [
  { name: "Target", icon: Target },
  { name: "Mail", icon: Mail },
  { name: "Phone", icon: Phone },
  { name: "Calendar", icon: Calendar },
  { name: "MessageSquare", icon: MessageSquare },
  { name: "FileText", icon: FileText },
  { name: "Users", icon: Users },
  { name: "Zap", icon: Zap },
  { name: "ShoppingCart", icon: ShoppingCart },
  { name: "CreditCard", icon: CreditCard },
  { name: "Globe", icon: Globe },
  { name: "Play", icon: Play },
  { name: "Headphones", icon: Headphones },
  { name: "Star", icon: Star },
  { name: "Heart", icon: Heart },
  { name: "Download", icon: Download },
  { name: "Send", icon: Send },
  { name: "BookOpen", icon: BookOpen },
  { name: "Clipboard", icon: Clipboard },
  { name: "Search", icon: Search },
  { name: "Bell", icon: Bell },
  { name: "Gift", icon: Gift },
  { name: "Award", icon: Award },
];

export function getIconComponent(name: string | null): LucideIcon {
  if (!name) return Target;
  const found = ICON_OPTIONS.find((o) => o.name.toLowerCase() === name.toLowerCase());
  return found?.icon || Target;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingType?: CaptureType | null;
}

export function CaptureTypeFormDialog({ open, onOpenChange, editingType }: Props) {
  const createMutation = useCreateCaptureType();
  const updateMutation = useUpdateCaptureType();

  const [label, setLabel] = useState("");
  const [key, setKey] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("Target");
  const [keyManuallyEdited, setKeyManuallyEdited] = useState(false);

  useEffect(() => {
    if (editingType) {
      setLabel(editingType.label);
      setKey(editingType.key);
      setDescription(editingType.description || "");
      setIcon(editingType.icon || "Target");
      setKeyManuallyEdited(true);
    } else {
      setLabel("");
      setKey("");
      setDescription("");
      setIcon("Target");
      setKeyManuallyEdited(false);
    }
  }, [editingType, open]);

  const handleLabelChange = (val: string) => {
    setLabel(val);
    if (!keyManuallyEdited) {
      setKey(val.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/(^_|_$)/g, ""));
    }
  };

  const handleSave = async () => {
    if (!label || !key) return;
    const payload = { label, key, description: description || undefined, icon };
    if (editingType) {
      await updateMutation.mutateAsync({ id: editingType.id, ...payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editingType ? "Editar Tipo de Captura" : "Novo Tipo de Captura"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Label</Label>
            <Input value={label} onChange={(e) => handleLabelChange(e.target.value)} placeholder="Ex: Formulário de Contacto" />
          </div>
          <div className="space-y-2">
            <Label>Key (identificador único)</Label>
            <Input
              value={key}
              onChange={(e) => { setKey(e.target.value); setKeyManuallyEdited(true); }}
              placeholder="formulario_contacto"
              className="font-mono text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreve o tipo de captura..."
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>Ícone</Label>
            <ScrollArea className="h-32 rounded-md border p-2">
              <div className="grid grid-cols-8 gap-1.5">
                {ICON_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.name}
                      type="button"
                      onClick={() => setIcon(opt.name)}
                      className={cn(
                        "flex items-center justify-center w-9 h-9 rounded-md transition-colors",
                        icon === opt.name
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted text-muted-foreground hover:text-foreground"
                      )}
                      title={opt.name}
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!label || !key || isPending}>
            {editingType ? "Guardar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
