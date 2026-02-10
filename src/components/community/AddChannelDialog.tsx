import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Hash } from "lucide-react";
import { useCreateForumCategory } from "@/hooks/useForumMutations";
import { cn } from "@/lib/utils";

interface AddChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string | undefined;
}

const EMOJI_GROUPS = [
  { label: "Geral", emojis: ["💬", "📢", "⭐", "❤️", "🔥", "⚡", "🚀", "🌍"] },
  { label: "Temas", emojis: ["📚", "🎨", "📸", "🎵", "💻", "📊", "🏆", "💎"] },
  { label: "Social", emojis: ["👥", "🎉", "☕", "🍕", "🎮", "💪", "🧠", "💡"] },
];

const CHANNEL_COLORS = [
  { hex: "#8B5CF6", label: "Violeta" },
  { hex: "#3B82F6", label: "Azul" },
  { hex: "#10B981", label: "Verde" },
  { hex: "#F59E0B", label: "Amarelo" },
  { hex: "#EF4444", label: "Vermelho" },
  { hex: "#EC4899", label: "Rosa" },
  { hex: "#6366F1", label: "Indigo" },
  { hex: "#14B8A6", label: "Teal" },
];

export function AddChannelDialog({ open, onOpenChange, workspaceId }: AddChannelDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("💬");
  const [customIcon, setCustomIcon] = useState("");
  const [color, setColor] = useState<string | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [price, setPrice] = useState("");

  const createCategory = useCreateForumCategory(workspaceId);

  const resetForm = () => {
    setName("");
    setDescription("");
    setIcon("💬");
    setCustomIcon("");
    setColor(null);
    setIsPrivate(false);
    setIsReadOnly(false);
    setIsPaid(false);
    setPrice("");
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    if (isPaid && (!price || parseFloat(price) < 0.5)) return;

    const finalIcon = customIcon.trim() || icon;

    createCategory.mutate(
      {
        name: name.trim(),
        description: description.trim() || null,
        icon: finalIcon,
        isPrivate,
        isReadOnly,
        isPaid,
        price: isPaid ? parseFloat(price) : null,
        color,
      },
      {
        onSuccess: () => {
          resetForm();
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5" /> Adicionar Canal
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Icon Selector */}
          <div className="space-y-2">
            <Label>Ícone</Label>
            {EMOJI_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="text-[11px] text-muted-foreground mb-1">{group.label}</p>
                <div className="flex flex-wrap gap-1">
                  {group.emojis.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => { setIcon(emoji); setCustomIcon(""); }}
                      className={cn(
                        "w-9 h-9 rounded-md text-lg flex items-center justify-center transition-all border",
                        icon === emoji && !customIcon
                          ? "border-primary bg-primary/10 ring-1 ring-primary"
                          : "border-transparent hover:bg-muted"
                      )}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex items-center gap-2 mt-1">
              <Input
                value={customIcon}
                onChange={(e) => setCustomIcon(e.target.value)}
                placeholder="Ou escreve um emoji..."
                maxLength={2}
                className="w-32 text-center text-lg"
              />
              {customIcon && (
                <span className="text-xs text-muted-foreground">Custom: {customIcon}</span>
              )}
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label>Nome do Canal</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: geral" maxLength={25} />
            <p className="text-[11px] text-muted-foreground">{name.length}/25 caracteres</p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Breve descrição do canal..." maxLength={60} rows={2} />
            <p className="text-[11px] text-muted-foreground">{description.length}/60 caracteres</p>
          </div>

          {/* Color Picker */}
          <div className="space-y-2">
            <Label>Cor do Canal</Label>
            <div className="flex gap-2">
              {CHANNEL_COLORS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  title={c.label}
                  onClick={() => setColor(color === c.hex ? null : c.hex)}
                  className={cn(
                    "w-8 h-8 rounded-full transition-all border-2",
                    color === c.hex ? "border-foreground scale-110 ring-2 ring-primary/30" : "border-transparent hover:scale-105"
                  )}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
            {color && <p className="text-[11px] text-muted-foreground">Selecionado: {CHANNEL_COLORS.find(c => c.hex === color)?.label}</p>}
          </div>

          {/* Toggles */}
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

            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <p className="text-sm font-medium">Canal Pago</p>
                <p className="text-xs text-muted-foreground">Membros pagam para aceder</p>
              </div>
              <Switch checked={isPaid} onCheckedChange={setIsPaid} />
            </div>

            {isPaid && (
              <div className="space-y-2 pl-1">
                <Label>Preço (EUR)</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">€</span>
                  <Input
                    type="number"
                    min="0.50"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="9.99"
                    className="w-28"
                  />
                </div>
                {price && parseFloat(price) < 0.5 && (
                  <p className="text-[11px] text-destructive">Preço mínimo: €0.50</p>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || createCategory.isPending || (isPaid && (!price || parseFloat(price) < 0.5))}
            className="gap-1.5"
          >
            {createCategory.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Criar Canal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
