import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Hash, Trash2, Sparkles } from "lucide-react";
import { useCreateForumCategory, useUpdateForumCategory, useDeleteForumCategory } from "@/hooks/useForumMutations";
import { useSuggestChannelDescription } from "@/hooks/useCommunityAI";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface ChannelData {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  is_private: boolean;
  is_read_only: boolean;
  is_paid: boolean;
  price: number | null;
}

interface AddChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string | undefined;
  channel?: ChannelData | null;
}

const EMOJI_GROUPS = [
  { label: "Geral", emojis: ["💬", "📢", "⭐", "❤️", "🔥", "⚡", "🚀", "🌍", "✅", "📌"] },
  { label: "Educação", emojis: ["📚", "🎓", "📝", "✏️", "🧪", "🔬", "📖", "🏫", "📐", "🗂️"] },
  { label: "Negócios", emojis: ["💼", "📊", "💰", "🏦", "📈", "🤝", "🏢", "💳", "🧾", "📋"] },
  { label: "Criatividade", emojis: ["🎨", "📸", "🎵", "🎬", "🖌️", "🎭", "✨", "🪄", "🎤", "🎹"] },
  { label: "Tecnologia", emojis: ["💻", "🖥️", "📱", "⚙️", "🔧", "🤖", "🌐", "🔒", "🛠️", "📡"] },
  { label: "Social", emojis: ["👥", "🎉", "☕", "🍕", "🎮", "💪", "🧠", "💡", "🫂", "🗣️"] },
  { label: "Lifestyle", emojis: ["🏋️", "🧘", "🍽️", "✈️", "🏠", "🌱", "🎯", "🏆", "💎", "🧳"] },
  { label: "Emoções", emojis: ["❤️‍🔥", "💯", "👏", "🙌", "🔑", "🌟", "⭕", "🎁", "🪩", "💫"] },
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

export function AddChannelDialog({ open, onOpenChange, workspaceId, channel }: AddChannelDialogProps) {
  const isEditing = !!channel;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("💬");
  const [customIcon, setCustomIcon] = useState("");
  const [color, setColor] = useState<string | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [price, setPrice] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const createCategory = useCreateForumCategory(workspaceId);
  const updateCategory = useUpdateForumCategory(workspaceId);
  const deleteCategory = useDeleteForumCategory(workspaceId);
  const suggestDescription = useSuggestChannelDescription();

  // Pre-fill when editing
  useEffect(() => {
    if (channel && open) {
      setName(channel.name);
      setDescription(channel.description || "");
      const channelIcon = channel.icon || "💬";
      const allEmojis = EMOJI_GROUPS.flatMap(g => g.emojis);
      if (allEmojis.includes(channelIcon)) {
        setIcon(channelIcon);
        setCustomIcon("");
      } else {
        setIcon("💬");
        setCustomIcon(channelIcon);
      }
      setColor(channel.color || null);
      setIsPrivate(channel.is_private);
      setIsReadOnly(channel.is_read_only);
      setIsPaid(channel.is_paid);
      setPrice(channel.price ? String(channel.price) : "");
    } else if (!channel && open) {
      resetForm();
    }
  }, [channel, open]);

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
    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      icon: finalIcon,
      isPrivate,
      isReadOnly,
      isPaid,
      price: isPaid ? parseFloat(price) : null,
      color,
    };

    if (isEditing) {
      updateCategory.mutate(
        { ...payload, id: channel!.id },
        {
          onSuccess: () => {
            onOpenChange(false);
          },
        }
      );
    } else {
      createCategory.mutate(payload, {
        onSuccess: () => {
          resetForm();
          onOpenChange(false);
        },
      });
    }
  };

  const handleDelete = () => {
    if (!channel) return;
    deleteCategory.mutate(channel.id, {
      onSuccess: () => {
        setDeleteConfirmOpen(false);
        onOpenChange(false);
      },
    });
  };

  const isSaving = createCategory.isPending || updateCategory.isPending;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Hash className="h-5 w-5" /> {isEditing ? "Editar Canal" : "Adicionar Canal"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Icon Selector */}
            <div className="space-y-2">
              <Label>Ícone</Label>
              <ScrollArea className="h-[180px] rounded-md border p-2">
                {EMOJI_GROUPS.map((group) => (
                  <div key={group.label} className="mb-2 last:mb-0">
                    <p className="text-[11px] text-muted-foreground mb-1 font-medium">{group.label}</p>
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
              </ScrollArea>
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
              <div className="flex items-center justify-between">
                <Label>Descrição</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-xs text-muted-foreground hover:text-primary"
                  disabled={!name.trim() || suggestDescription.isPending}
                  onClick={() => {
                    suggestDescription.mutate({ channelName: name.trim() }, {
                      onSuccess: (desc) => setDescription(desc),
                    });
                  }}
                >
                  {suggestDescription.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  Sugerir com IA
                </Button>
              </div>
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

          <DialogFooter className="flex-row justify-between sm:justify-between">
            {isEditing ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteConfirmOpen(true)}
                disabled={deleteCategory.isPending}
                className="gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" /> Eliminar
              </Button>
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button
                onClick={handleSubmit}
                disabled={!name.trim() || isSaving || (isPaid && (!price || parseFloat(price) < 0.5))}
                className="gap-1.5"
              >
                {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {isEditing ? "Guardar" : "Criar Canal"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar canal?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. Todos os tópicos e respostas deste canal serão eliminados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteCategory.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
