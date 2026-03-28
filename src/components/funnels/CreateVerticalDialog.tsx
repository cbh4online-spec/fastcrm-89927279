import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, X, Star } from "lucide-react";
import { getIconByName, INDUSTRY_ICONS } from "@/lib/icons";
import { useCreateVertical, useUpdateVertical, Vertical } from "@/hooks/useVerticals";

interface TagInputProps {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}

function TagInput({ value, onChange, placeholder }: TagInputProps) {
  const [input, setInput] = useState("");

  const addTag = () => {
    const tag = input.trim();
    if (tag && !value.includes(tag)) {
      onChange([...value, tag]);
      setInput("");
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5 min-h-[32px]">
        {value.map((tag) => (
          <Badge key={tag} variant="secondary" className="gap-1 pr-1">
            {tag}
            <button
              type="button"
              onClick={() => onChange(value.filter((t) => t !== tag))}
              className="hover:bg-muted rounded-full p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            addTag();
          }
        }}
        onBlur={addTag}
        placeholder={placeholder || "Escreve e prime Enter"}
      />
    </div>
  );
}

function PriorityStars({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="p-0.5 hover:scale-110 transition-transform"
        >
          <Star
            className={`h-5 w-5 ${n <= value ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
          />
        </button>
      ))}
    </div>
  );
}

function IconPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1">
      {INDUSTRY_ICONS.map((cat) => (
        <div key={cat.category}>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">{cat.category}</p>
          <div className="flex flex-wrap gap-1.5">
            {cat.icons.map((name) => {
              const Icon = getIconByName(name);
              const selected = value === name;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => onChange(name)}
                  className={`p-2 rounded-md border transition-colors ${
                    selected
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-transparent hover:border-border hover:bg-muted"
                  }`}
                  title={name}
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export interface VerticalFormData {
  name: string;
  slug: string;
  description?: string;
  color_theme?: string;
  icon?: string;
  target_audience?: string;
  keywords?: string[];
  pain_points?: string[];
  value_proposition?: string;
  avg_ticket?: number;
  market_size?: string;
  priority?: number;
  default_cta?: string;
  notes?: string;
  status?: string;
}

interface CreateVerticalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingVertical?: Vertical | null;
}

export function CreateVerticalDialog({ open, onOpenChange, editingVertical }: CreateVerticalDialogProps) {
  const createVertical = useCreateVertical();
  const updateVertical = useUpdateVertical();
  const isEditing = !!editingVertical;

  const [form, setForm] = useState<VerticalFormData>({
    name: "",
    slug: "",
    description: "",
    color_theme: "#6366f1",
    icon: "",
    target_audience: "",
    keywords: [],
    pain_points: [],
    value_proposition: "",
    avg_ticket: undefined,
    market_size: "",
    priority: 3,
    default_cta: "",
    notes: "",
    status: "active",
  });

  useEffect(() => {
    if (editingVertical) {
      setForm({
        name: editingVertical.name || "",
        slug: editingVertical.slug || "",
        description: editingVertical.description || "",
        color_theme: (editingVertical as any).color_theme || "#6366f1",
        icon: (editingVertical as any).icon || "",
        target_audience: (editingVertical as any).target_audience || "",
        keywords: (editingVertical as any).keywords || [],
        pain_points: (editingVertical as any).pain_points || [],
        value_proposition: (editingVertical as any).value_proposition || "",
        avg_ticket: (editingVertical as any).avg_ticket || undefined,
        market_size: (editingVertical as any).market_size || "",
        priority: (editingVertical as any).priority || 3,
        default_cta: (editingVertical as any).default_cta || "",
        notes: (editingVertical as any).notes || "",
        status: editingVertical.status || "active",
      });
    } else {
      setForm({
        name: "", slug: "", description: "", color_theme: "#6366f1", icon: "",
        target_audience: "", keywords: [], pain_points: [], value_proposition: "",
        avg_ticket: undefined, market_size: "", priority: 3, default_cta: "",
        notes: "", status: "active",
      });
    }
  }, [editingVertical, open]);

  const set = <K extends keyof VerticalFormData>(k: K, v: VerticalFormData[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name || !form.slug) return;
    const payload: any = { ...form };
    if (payload.avg_ticket === undefined || payload.avg_ticket === "") delete payload.avg_ticket;
    else payload.avg_ticket = Number(payload.avg_ticket);

    if (isEditing) {
      await updateVertical.mutateAsync({ id: editingVertical!.id, ...payload });
    } else {
      await createVertical.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  const isPending = createVertical.isPending || updateVertical.isPending;
  const SelectedIcon = form.icon ? getIconByName(form.icon) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {SelectedIcon && (
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: form.color_theme + "20", color: form.color_theme }}
              >
                <SelectedIcon className="h-4 w-4" />
              </div>
            )}
            {isEditing ? "Editar Vertical" : "Nova Vertical"}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="identity" className="mt-2">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="identity">Identidade</TabsTrigger>
            <TabsTrigger value="market">Mercado</TabsTrigger>
            <TabsTrigger value="seo">SEO & Funis</TabsTrigger>
          </TabsList>

          {/* Tab: Identidade */}
          <TabsContent value="identity" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => {
                    set("name", e.target.value);
                    if (!isEditing) {
                      set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));
                    }
                  }}
                  placeholder="Ex: Clínicas Dentárias"
                />
              </div>
              <div className="space-y-2">
                <Label>Slug (URL) *</Label>
                <Input
                  value={form.slug}
                  onChange={(e) => set("slug", e.target.value)}
                  placeholder="clinicas-dentarias"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Descreve o foco desta vertical..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cor do Tema</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.color_theme}
                    onChange={(e) => set("color_theme", e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer border-0"
                  />
                  <Input
                    value={form.color_theme}
                    onChange={(e) => set("color_theme", e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <div className="flex items-center gap-3 pt-2">
                  <Switch
                    checked={form.status === "active"}
                    onCheckedChange={(c) => set("status", c ? "active" : "inactive")}
                  />
                  <span className="text-sm">{form.status === "active" ? "Ativo" : "Inativo"}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Ícone</Label>
              <IconPicker value={form.icon || ""} onChange={(v) => set("icon", v)} />
            </div>
          </TabsContent>

          {/* Tab: Mercado */}
          <TabsContent value="market" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Público-alvo</Label>
              <Textarea
                value={form.target_audience}
                onChange={(e) => set("target_audience", e.target.value)}
                placeholder="Donos de clínicas dentárias em Portugal, 35-55 anos, que querem mais pacientes..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Dores do Público</Label>
              <TagInput
                value={form.pain_points || []}
                onChange={(v) => set("pain_points", v)}
                placeholder="Ex: Falta de pacientes, Concorrência online..."
              />
            </div>

            <div className="space-y-2">
              <Label>Proposta de Valor</Label>
              <Textarea
                value={form.value_proposition}
                onChange={(e) => set("value_proposition", e.target.value)}
                placeholder="O que torna esta vertical única? Qual o benefício principal?"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Ticket Médio (€)</Label>
                <Input
                  type="number"
                  value={form.avg_ticket ?? ""}
                  onChange={(e) => set("avg_ticket", e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="500"
                />
              </div>
              <div className="space-y-2">
                <Label>Tamanho do Mercado</Label>
                <Select value={form.market_size || ""} onValueChange={(v) => set("market_size", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pequeno">Pequeno</SelectItem>
                    <SelectItem value="medio">Médio</SelectItem>
                    <SelectItem value="grande">Grande</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <PriorityStars value={form.priority || 3} onChange={(v) => set("priority", v)} />
              </div>
            </div>
          </TabsContent>

          {/* Tab: SEO & Funis */}
          <TabsContent value="seo" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Keywords SEO</Label>
              <TagInput
                value={form.keywords || []}
                onChange={(v) => set("keywords", v)}
                placeholder="Ex: marketing dentário, clínica dentária online..."
              />
            </div>

            <div className="space-y-2">
              <Label>CTA Padrão</Label>
              <Input
                value={form.default_cta}
                onChange={(e) => set("default_cta", e.target.value)}
                placeholder="Ex: Agendar Consulta Grátis"
              />
            </div>

            <div className="space-y-2">
              <Label>Notas Internas</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Notas visíveis apenas para a equipa..."
                rows={4}
              />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!form.name || !form.slug || isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Guardar Alterações" : "Criar Vertical"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
