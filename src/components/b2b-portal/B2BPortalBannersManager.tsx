import { useMemo, useRef, useState } from "react";
import {
  useAllPartnerSlides,
  useUpsertPartnerSlide,
  useDeletePartnerSlide,
  PARTNER_SLIDE_KIND_LABEL,
  PARTNER_SLIDE_KIND_ACCENT,
  type PartnerPortalSlide,
  type PartnerSlideKind,
} from "@/hooks/usePartnerPortalSlides";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, Loader2, Image as ImageIcon, Upload, ArrowUp, ArrowDown,
  Sparkles, Eye, EyeOff, Calendar, ExternalLink, Download,
} from "lucide-react";

interface Props {
  workspaceId?: string | null;
}

const empty = (workspaceId: string, order = 0): Partial<PartnerPortalSlide> => ({
  workspace_id: workspaceId,
  kind: "campaign",
  eyebrow: "",
  title: "",
  subtitle: "",
  description: "",
  image_url: "",
  cta_label: "",
  cta_url: "",
  display_order: order,
  is_active: true,
  theme: "light",
});

const SAMPLE_BANNERS = (wid: string): Partial<PartnerPortalSlide>[] => [
  {
    workspace_id: wid, kind: "campaign", eyebrow: "Campanha do mês",
    title: "Linha Fitozon — 15% em packs profissionais",
    subtitle: "Sinergias de óleos vegetais ozonizados para protocolos clínicos.",
    description: "Aplicável até final do mês em encomendas a partir de 250€.",
    image_url: "https://images.unsplash.com/photo-1556228852-80b6e5eeff06?auto=format&fit=crop&w=1600&q=80",
    cta_label: "Ver catálogo", cta_url: "/client/catalog",
    display_order: 0, is_active: true, theme: "light",
  },
  {
    workspace_id: wid, kind: "training", eyebrow: "Próxima formação · 14 maio",
    title: "Masterclass: Protocolos de pele sensível",
    subtitle: "90 minutos com a Dra. Inês Carvalho, em direto e gravado.",
    description: "Inscrição gratuita para parceiros profissionais.",
    image_url: "https://images.unsplash.com/photo-1559599101-f09722fb4948?auto=format&fit=crop&w=1600&q=80",
    cta_label: "Inscrever-me", cta_url: "/client/assistant",
    display_order: 1, is_active: true, theme: "light",
  },
  {
    workspace_id: wid, kind: "launch", eyebrow: "Novo lançamento",
    title: "Acqua Soft — bruma corporal refrescante",
    subtitle: "Água de coco e lavanda francesa. Pele macia, hidratada e luminosa.",
    description: "Disponível agora em embalagem profissional 500ml.",
    image_url: "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=1600&q=80",
    cta_label: "Descobrir produto", cta_url: "/client/catalog",
    display_order: 2, is_active: true, theme: "light",
  },
  {
    workspace_id: wid, kind: "education", eyebrow: "Protocolo · Conteúdo educativo",
    title: "Como construir um protocolo facial em 4 passos",
    subtitle: "Guia técnico baseado nos casos clínicos da equipa.",
    description: "Material descarregável + checklist de aplicação.",
    image_url: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=1600&q=80",
    cta_label: "Ler protocolo", cta_url: "/client/diagnosis",
    display_order: 3, is_active: true, theme: "light",
  },
];

function toLocalDt(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fromLocalDt(v: string) {
  return v ? new Date(v).toISOString() : null;
}

export function B2BPortalBannersManager({ workspaceId }: Props) {
  const { data: slides = [], isLoading } = useAllPartnerSlides(workspaceId);
  const upsert = useUpsertPartnerSlide(workspaceId);
  const remove = useDeletePartnerSlide();
  const fileRef = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState<Partial<PartnerPortalSlide> | null>(null);
  const [uploading, setUploading] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const sortedSlides = useMemo(
    () => [...slides].sort((a, b) => a.display_order - b.display_order),
    [slides]
  );

  const openNew = () => {
    if (!workspaceId) return;
    const nextOrder = (sortedSlides[sortedSlides.length - 1]?.display_order ?? -1) + 1;
    setEditing(empty(workspaceId, nextOrder));
  };
  const openEdit = (s: PartnerPortalSlide) => setEditing({ ...s });

  const handleSave = async () => {
    if (!editing || !editing.workspace_id || !editing.title) return;
    await upsert.mutateAsync(editing as any);
    setEditing(null);
  };

  const handleUpload = async (file: File) => {
    if (!workspaceId) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem demasiado grande (máx 5MB)");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${workspaceId}/banners/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("store-assets")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("store-assets").getPublicUrl(path);
      setEditing((prev) => prev ? { ...prev, image_url: `${data.publicUrl}?t=${Date.now()}` } : prev);
      toast.success("Imagem carregada");
    } catch (e) {
      toast.error("Erro ao carregar imagem: " + (e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const move = async (s: PartnerPortalSlide, dir: -1 | 1) => {
    const idx = sortedSlides.findIndex((x) => x.id === s.id);
    const swap = sortedSlides[idx + dir];
    if (!swap) return;
    await Promise.all([
      upsert.mutateAsync({ ...s, display_order: swap.display_order } as any),
      upsert.mutateAsync({ ...swap, display_order: s.display_order } as any),
    ]);
  };

  const toggleActive = (s: PartnerPortalSlide) => {
    upsert.mutate({ ...s, is_active: !s.is_active } as any);
  };

  const seedSamples = async () => {
    if (!workspaceId) return;
    if (!confirm("Importar 4 banners de exemplo? (podes editá-los a seguir)")) return;
    setSeeding(true);
    try {
      const baseOrder = (sortedSlides[sortedSlides.length - 1]?.display_order ?? -1) + 1;
      const samples = SAMPLE_BANNERS(workspaceId).map((s, i) => ({ ...s, display_order: baseOrder + i }));
      for (const s of samples) await upsert.mutateAsync(s as any);
      toast.success("Banners de exemplo importados");
    } catch (e) {
      toast.error("Erro ao importar: " + (e as Error).message);
    } finally {
      setSeeding(false);
    }
  };

  if (!workspaceId) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground text-sm">
          Workspace não disponível.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" /> Banners do Portal B2B
            </CardTitle>
            <CardDescription>
              Gerir os banners rotativos exibidos no hero do dashboard do portal profissional.
              Os banners aparecem por <strong>ordem</strong> e respeitam as <strong>janelas de exibição</strong>.
            </CardDescription>
          </div>
          <div className="flex gap-2 flex-wrap">
            {sortedSlides.length === 0 && (
              <Button variant="outline" size="sm" onClick={seedSamples} disabled={seeding}>
                {seeding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                Importar exemplos
              </Button>
            )}
            <Button onClick={openNew} size="sm">
              <Plus className="h-4 w-4 mr-2" /> Novo banner
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : sortedSlides.length === 0 ? (
            <div className="py-16 text-center border border-dashed rounded-lg">
              <ImageIcon className="h-10 w-10 mx-auto mb-3 text-muted-foreground/60" />
              <p className="text-sm font-medium mb-1">Sem banners ainda</p>
              <p className="text-xs text-muted-foreground mb-4">
                O portal mostra banners de exemplo enquanto não criares os teus.
              </p>
              <div className="flex justify-center gap-2">
                <Button variant="outline" size="sm" onClick={seedSamples} disabled={seeding}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Importar exemplos
                </Button>
                <Button size="sm" onClick={openNew}>
                  <Plus className="h-4 w-4 mr-2" /> Criar do zero
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-3">
              {sortedSlides.map((s, idx) => (
                <div
                  key={s.id}
                  className={`flex items-stretch gap-4 rounded-lg border p-3 transition-all ${
                    s.is_active ? "bg-card" : "bg-muted/30 opacity-70"
                  }`}
                >
                  <div className="relative w-32 h-20 rounded-md overflow-hidden bg-muted flex-shrink-0">
                    {s.image_url ? (
                      <img src={s.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge variant="outline" className="text-[10px]">
                        {PARTNER_SLIDE_KIND_LABEL[s.kind]}
                      </Badge>
                      {!s.is_active && <Badge variant="secondary" className="text-[10px]">Inativo</Badge>}
                      {(s.starts_at || s.ends_at) && (
                        <Badge variant="outline" className="text-[10px] gap-1">
                          <Calendar className="h-3 w-3" />
                          {s.starts_at ? new Date(s.starts_at).toLocaleDateString("pt-PT") : "—"}
                          {" → "}
                          {s.ends_at ? new Date(s.ends_at).toLocaleDateString("pt-PT") : "∞"}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">#{s.display_order}</span>
                    </div>
                    {s.eyebrow && <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-0.5">{s.eyebrow}</p>}
                    <p className="font-medium truncate">{s.title}</p>
                    {s.subtitle && <p className="text-sm text-muted-foreground truncate">{s.subtitle}</p>}
                  </div>
                  <div className="flex flex-col items-center justify-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => move(s, -1)} disabled={idx === 0} aria-label="Subir">
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => move(s, 1)} disabled={idx === sortedSlides.length - 1} aria-label="Descer">
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="flex flex-col items-center justify-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleActive(s)} aria-label={s.is_active ? "Desativar" : "Ativar"}>
                      {s.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(s)} aria-label="Editar">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8"
                      onClick={() => confirm("Remover este banner?") && remove.mutate(s.id)}
                      aria-label="Remover"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar banner" : "Novo banner"}</DialogTitle>
            <DialogDescription>
              Configura o conteúdo, imagem, agendamento e CTA do banner.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <Tabs defaultValue="content" className="w-full">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="content">Conteúdo</TabsTrigger>
                <TabsTrigger value="media">Imagem & CTA</TabsTrigger>
                <TabsTrigger value="schedule">Agendamento</TabsTrigger>
              </TabsList>

              <TabsContent value="content" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Tipo</Label>
                    <Select
                      value={editing.kind}
                      onValueChange={(v) => setEditing({ ...editing, kind: v as PartnerSlideKind })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(PARTNER_SLIDE_KIND_LABEL).map(([k, l]) => (
                          <SelectItem key={k} value={k}>{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {editing.kind && PARTNER_SLIDE_KIND_ACCENT[editing.kind as PartnerSlideKind]}
                    </p>
                  </div>
                  <div>
                    <Label>Tema</Label>
                    <Select
                      value={editing.theme || "light"}
                      onValueChange={(v) => setEditing({ ...editing, theme: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Claro</SelectItem>
                        <SelectItem value="dark">Escuro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Eyebrow <span className="text-muted-foreground font-normal">(etiqueta pequena acima do título)</span></Label>
                  <Input
                    value={editing.eyebrow || ""}
                    onChange={(e) => setEditing({ ...editing, eyebrow: e.target.value })}
                    placeholder="Ex.: Campanha do mês · Junho"
                    maxLength={60}
                  />
                </div>
                <div>
                  <Label>Título *</Label>
                  <Input
                    value={editing.title || ""}
                    onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                    placeholder="Ex.: 15% em packs profissionais"
                    maxLength={120}
                  />
                </div>
                <div>
                  <Label>Subtítulo</Label>
                  <Input
                    value={editing.subtitle || ""}
                    onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })}
                    maxLength={160}
                  />
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Textarea
                    rows={3}
                    value={editing.description || ""}
                    onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                    maxLength={300}
                  />
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <Switch
                    checked={!!editing.is_active}
                    onCheckedChange={(v) => setEditing({ ...editing, is_active: v })}
                  />
                  <Label>Banner ativo</Label>
                </div>
              </TabsContent>

              <TabsContent value="media" className="space-y-4 mt-4">
                <div>
                  <Label>Imagem (1600×900 recomendado)</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={editing.image_url || ""}
                      onChange={(e) => setEditing({ ...editing, image_url: e.target.value })}
                      placeholder="https://... ou faz upload →"
                    />
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                    />
                    <Button
                      variant="outline"
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      type="button"
                    >
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    </Button>
                  </div>
                  {editing.image_url && (
                    <div className="mt-3 w-full aspect-[16/9] rounded-lg overflow-hidden bg-muted border">
                      <img src={editing.image_url} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Texto do botão</Label>
                    <Input
                      value={editing.cta_label || ""}
                      onChange={(e) => setEditing({ ...editing, cta_label: e.target.value })}
                      placeholder="Ex.: Ver catálogo"
                      maxLength={40}
                    />
                  </div>
                  <div>
                    <Label>Link do botão</Label>
                    <Input
                      value={editing.cta_url || ""}
                      onChange={(e) => setEditing({ ...editing, cta_url: e.target.value })}
                      placeholder="/client/catalog ou https://..."
                    />
                  </div>
                </div>
                {editing.cta_url && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" />
                    Links internos começam com <code className="bg-muted px-1 rounded">/client/...</code>
                  </p>
                )}
              </TabsContent>

              <TabsContent value="schedule" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Inicia em</Label>
                    <Input
                      type="datetime-local"
                      value={toLocalDt(editing.starts_at)}
                      onChange={(e) => setEditing({ ...editing, starts_at: fromLocalDt(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Termina em</Label>
                    <Input
                      type="datetime-local"
                      value={toLocalDt(editing.ends_at)}
                      onChange={(e) => setEditing({ ...editing, ends_at: fromLocalDt(e.target.value) })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Ordem de apresentação</Label>
                  <Input
                    type="number"
                    value={editing.display_order ?? 0}
                    onChange={(e) => setEditing({ ...editing, display_order: Number(e.target.value) })}
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Banners com ordem mais baixa aparecem primeiro.
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Deixa as datas vazias para o banner aparecer sempre (enquanto estiver ativo).
                </p>
              </TabsContent>
            </Tabs>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!editing?.title || upsert.isPending}>
              {upsert.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar banner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
