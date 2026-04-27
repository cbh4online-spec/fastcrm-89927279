import { useState } from "react";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save } from "lucide-react";
import { useSaveBuilderBlock } from "../hooks/useBuilderBlocks";
import { useAuth } from "@/contexts/AuthContext";
import { BLOCK_CATEGORY_LABEL, type BuilderBlockCategory } from "../lib/blocks";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** HTML inicial do bloco (selecção ou tudo). */
  initialHtml: string;
  /** É super-admin? Se sim mostra toggle de partilha global. */
  isSuperAdmin?: boolean;
}

const CATEGORIES: BuilderBlockCategory[] = [
  "header", "hero", "features", "stats", "cta",
  "pricing", "testimonials", "faq", "form", "footer", "custom",
];

export function SaveBlockDialog({ open, onOpenChange, initialHtml, isSuperAdmin }: Props) {
  const save = useSaveBuilderBlock();
  const { user } = useAuth();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<BuilderBlockCategory>("custom");
  const [html, setHtml] = useState(initialHtml);
  const [global, setGlobal] = useState(false);

  // hidrata HTML quando abre/recebe novo
  if (open && html !== initialHtml && !name && !description) {
    setHtml(initialHtml);
  }

  const reset = () => {
    setName("");
    setDescription("");
    setCategory("custom");
    setGlobal(false);
  };

  const handleSave = async () => {
    if (!user) return;
    if (name.trim().length < 2) {
      toast.error("Dá um nome ao bloco");
      return;
    }
    if (html.trim().length < 10) {
      toast.error("HTML demasiado curto");
      return;
    }
    try {
      await save.mutateAsync({
        name,
        description,
        category,
        html,
        scope: global ? "global" : "workspace",
      });
      toast.success("Bloco guardado", {
        description: global ? "Disponível em todos os workspaces." : "Disponível neste workspace.",
      });
      reset();
      onOpenChange(false);
    } catch (e) {
      toast.error("Erro ao guardar", {
        description: e instanceof Error ? e.message : undefined,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Guardar como bloco reutilizável</DialogTitle>
          <DialogDescription>
            O bloco fica disponível na biblioteca para ser inserido noutros assets.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="block-name">Nome</Label>
            <Input
              id="block-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Hero promocional verão"
              maxLength={120}
            />
          </div>

          <div>
            <Label htmlFor="block-desc">Descrição (opcional)</Label>
            <Input
              id="block-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Quando usar este bloco?"
              maxLength={200}
            />
          </div>

          <div>
            <Label htmlFor="block-cat">Categoria</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as BuilderBlockCategory)}>
              <SelectTrigger id="block-cat">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {BLOCK_CATEGORY_LABEL[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="block-html">HTML</Label>
            <Textarea
              id="block-html"
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              rows={6}
              className="font-mono text-xs"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              {html.length.toLocaleString("pt-PT")} caracteres
            </p>
          </div>

          {isSuperAdmin && (
            <div className="flex items-center justify-between p-3 border rounded-lg bg-amber-50/50 border-amber-200">
              <div>
                <Label htmlFor="block-global" className="font-medium">
                  Partilhar globalmente
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Visível em todos os workspaces (super-admin).
                </p>
              </div>
              <Switch id="block-global" checked={global} onCheckedChange={setGlobal} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={save.isPending}>
            {save.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Guardar bloco
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
