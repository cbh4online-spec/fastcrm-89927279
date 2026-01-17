import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, ImagePlus, Trash2, Sparkles } from "lucide-react";
import { useCreateSaasCategory, useUpdateSaasCategory, SaasCategory } from "@/hooks/useSaasCategories";

interface SaasCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: SaasCategory | null;
}

const defaultColors = [
  "#3B82F6", "#8B5CF6", "#EC4899", "#F97316", "#10B981",
  "#06B6D4", "#EAB308", "#6366F1", "#EF4444", "#14B8A6",
];

export function SaasCategoryDialog({ open, onOpenChange, category }: SaasCategoryDialogProps) {
  const createCategory = useCreateSaasCategory();
  const updateCategory = useUpdateSaasCategory();
  const isEditing = !!category;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(defaultColors[0]);
  const [imageUrl, setImageUrl] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  useEffect(() => {
    if (category) {
      setName(category.name);
      setDescription(category.description || "");
      setColor(category.color || defaultColors[0]);
      setImageUrl(category.image_url || "");
      setIsActive(category.is_active);
    } else {
      setName("");
      setDescription("");
      setColor(defaultColors[Math.floor(Math.random() * defaultColors.length)]);
      setImageUrl("");
      setIsActive(true);
    }
  }, [category, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = {
      name,
      description: description || undefined,
      color,
      image_url: imageUrl || undefined,
      is_active: isActive,
    };

    if (isEditing && category) {
      await updateCategory.mutateAsync({ id: category.id, ...data });
    } else {
      await createCategory.mutateAsync(data);
    }

    onOpenChange(false);
  };

  const isSubmitting = createCategory.isPending || updateCategory.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Categoria" : "Nova Categoria SaaS"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Integrações, IA, Comunicação..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve descrição da categoria..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex gap-2 flex-wrap">
              {defaultColors.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    color === c ? "border-foreground scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="imageUrl">Imagem da Categoria</Label>
            <div className="flex gap-2">
              <Input
                id="imageUrl"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="URL da imagem ou gerar com IA"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={isGeneratingImage || !name}
                onClick={() => {
                  // Placeholder for AI image generation
                  setIsGeneratingImage(true);
                  setTimeout(() => setIsGeneratingImage(false), 2000);
                }}
                title="Gerar imagem com IA"
              >
                {isGeneratingImage ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
              </Button>
            </div>
            {imageUrl && (
              <div className="relative w-20 h-20 mt-2">
                <img
                  src={imageUrl}
                  alt="Preview"
                  className="w-full h-full object-cover rounded-lg border"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6"
                  onClick={() => setImageUrl("")}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="isActive" className="cursor-pointer">
              Categoria ativa
            </Label>
            <Switch
              id="isActive"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !name.trim()}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? "Guardar" : "Criar Categoria"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
