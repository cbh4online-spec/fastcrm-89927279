import { useEffect, useMemo, useRef, useState } from "react";
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
import { useCreditWallet } from "@/hooks/useCreditWallet";
import { triggerNoCreditsDialog } from "@/hooks/useNoCreditsDialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, Loader2, Image as ImageIcon, Upload, ArrowUp, ArrowDown,
  Sparkles, Eye, EyeOff, Calendar, ExternalLink, Download, Copy, AlertCircle,
  ShieldAlert, Search, X,
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

const KIND_COLOR: Record<PartnerSlideKind, string> = {
  campaign: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
  training: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
  launch: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  education: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
};

export function B2BPortalBannersManager({ workspaceId }: Props) {
  const { data: slides = [], isLoading, error: loadError } = useAllPartnerSlides(workspaceId);
  const upsert = useUpsertPartnerSlide(workspaceId);
  const remove = useDeletePartnerSlide();
  const fileRef = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState<Partial<PartnerPortalSlide> | null>(null);
  const [uploading, setUploading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<PartnerPortalSlide | null>(null);
  const [confirmSeed, setConfirmSeed] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [search, setSearch] = useState("");
  const [filterKind, setFilterKind] = useState<PartnerSlideKind | "all">("all");
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  // Verificar se é admin do workspace OU super admin (UX clara)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!workspaceId) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (!cancelled) setIsAdmin(false); return; }
      const [adminRes, superRes] = await Promise.all([
        (supabase as any).rpc("is_workspace_admin", { _user_id: user.id, _workspace_id: workspaceId }),
        (supabase as any).rpc("is_super_admin", { _user_id: user.id }),
      ]);
      if (!cancelled) setIsAdmin(!!adminRes.data || !!superRes.data);
    })();
    return () => { cancelled = true; };
  }, [workspaceId]);

  const sortedSlides = useMemo(
    () => [...slides].sort((a, b) => a.display_order - b.display_order),
    [slides]
  );

  const filteredSlides = useMemo(() => {
    return sortedSlides.filter((s) => {
      if (filterKind !== "all" && s.kind !== filterKind) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          s.title?.toLowerCase().includes(q) ||
          s.subtitle?.toLowerCase().includes(q) ||
          s.eyebrow?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [sortedSlides, search, filterKind]);

  const stats = useMemo(() => {
    const now = Date.now();
    const active = sortedSlides.filter((s) => s.is_active);
    const visible = active.filter((s) => {
      const startsOk = !s.starts_at || new Date(s.starts_at).getTime() <= now;
      const endsOk = !s.ends_at || new Date(s.ends_at).getTime() >= now;
      return startsOk && endsOk;
    });
    return { total: sortedSlides.length, active: active.length, visible: visible.length };
  }, [sortedSlides]);

  const openNew = () => {
    if (!workspaceId) return;
    const nextOrder = (sortedSlides[sortedSlides.length - 1]?.display_order ?? -1) + 1;
    setEditing(empty(workspaceId, nextOrder));
  };
  const openEdit = (s: PartnerPortalSlide) => setEditing({ ...s });

  const duplicate = async (s: PartnerPortalSlide) => {
    if (!workspaceId) return;
    const { id, created_at, updated_at, ...rest } = s as any;
    const nextOrder = (sortedSlides[sortedSlides.length - 1]?.display_order ?? -1) + 1;
    try {
      await upsert.mutateAsync({
        ...rest,
        title: `${s.title} (cópia)`,
        display_order: nextOrder,
        is_active: false,
      } as any);
    } catch (e) {
      toast.error("Erro ao duplicar: " + (e as Error).message);
    }
  };

  const handleSave = async () => {
    if (!editing || !editing.workspace_id || !editing.title?.trim()) {
      toast.error("Título é obrigatório");
      return;
    }
    try {
      await upsert.mutateAsync(editing as any);
      setEditing(null);
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.toLowerCase().includes("row-level") || msg.toLowerCase().includes("policy")) {
        toast.error("Sem permissão: precisas de ser administrador do workspace");
      } else {
        toast.error("Erro ao guardar: " + msg);
      }
    }
  };

  const handleUpload = async (file: File) => {
    if (!workspaceId) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Apenas imagens são suportadas");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem demasiado grande (máx 5MB)");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${workspaceId}/banners/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
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
    try {
      await Promise.all([
        upsert.mutateAsync({ ...s, display_order: swap.display_order } as any),
        upsert.mutateAsync({ ...swap, display_order: s.display_order } as any),
      ]);
    } catch (e) {
      toast.error("Erro ao reordenar: " + (e as Error).message);
    }
  };

  const toggleActive = async (s: PartnerPortalSlide) => {
    try {
      await upsert.mutateAsync({ ...s, is_active: !s.is_active } as any);
    } catch (e) {
      toast.error("Erro: " + (e as Error).message);
    }
  };

  const seedSamples = async () => {
    if (!workspaceId) return;
    setSeeding(true);
    try {
      const baseOrder = (sortedSlides[sortedSlides.length - 1]?.display_order ?? -1) + 1;
      const samples = SAMPLE_BANNERS(workspaceId).map((s, i) => ({ ...s, display_order: baseOrder + i }));
      for (const s of samples) await upsert.mutateAsync(s as any);
      toast.success("4 banners de exemplo importados");
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.toLowerCase().includes("row-level") || msg.toLowerCase().includes("policy")) {
        toast.error("Sem permissão: precisas de ser administrador do workspace");
      } else {
        toast.error("Erro ao importar: " + msg);
      }
    } finally {
      setSeeding(false);
      setConfirmSeed(false);
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

  const isWindowActive = (s: PartnerPortalSlide) => {
    const now = Date.now();
    const startsOk = !s.starts_at || new Date(s.starts_at).getTime() <= now;
    const endsOk = !s.ends_at || new Date(s.ends_at).getTime() >= now;
    return startsOk && endsOk;
  };

  return (
    <>
      {isAdmin === false && (
        <Alert variant="destructive" className="mb-4">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Sem permissões para editar banners</AlertTitle>
          <AlertDescription>
            Só administradores do workspace podem criar, editar ou remover banners. Pede a um admin para te promover.
          </AlertDescription>
        </Alert>
      )}

      {loadError && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro ao carregar banners</AlertTitle>
          <AlertDescription>{(loadError as Error).message}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" /> Banners do Portal B2B
            </CardTitle>
            <CardDescription className="mt-1">
              Banners rotativos no hero do portal profissional. Ordem mais baixa aparece primeiro;
              janelas de exibição (datas) controlam quando ficam visíveis.
            </CardDescription>
            {sortedSlides.length > 0 && (
              <div className="flex gap-3 mt-3 text-xs text-muted-foreground">
                <span><strong className="text-foreground">{stats.total}</strong> total</span>
                <span><strong className="text-foreground">{stats.active}</strong> ativos</span>
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  <strong className="text-foreground">{stats.visible}</strong> visíveis agora
                </span>
              </div>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {sortedSlides.length === 0 && (
              <Button
                variant="outline" size="sm"
                onClick={() => setConfirmSeed(true)}
                disabled={seeding || isAdmin === false}
              >
                {seeding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                Importar exemplos
              </Button>
            )}
            <Button onClick={openNew} size="sm" disabled={isAdmin === false}>
              <Plus className="h-4 w-4 mr-2" /> Novo banner
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {sortedSlides.length > 0 && (
            <div className="flex gap-2 mb-4 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar banners..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 pr-8 h-9"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-2 top-2.5"
                    aria-label="Limpar"
                  >
                    <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                  </button>
                )}
              </div>
              <Select value={filterKind} onValueChange={(v) => setFilterKind(v as any)}>
                <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  {Object.entries(PARTNER_SLIDE_KIND_LABEL).map(([k, l]) => (
                    <SelectItem key={k} value={k}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : sortedSlides.length === 0 ? (
            <div className="py-16 text-center border border-dashed rounded-lg">
              <ImageIcon className="h-10 w-10 mx-auto mb-3 text-muted-foreground/60" />
              <p className="text-sm font-medium mb-1">Sem banners ainda</p>
              <p className="text-xs text-muted-foreground mb-4 max-w-md mx-auto">
                O portal mostra 4 banners de exemplo enquanto não criares os teus.
                Importa-os para começar e personaliza depois.
              </p>
              <div className="flex justify-center gap-2 flex-wrap">
                <Button
                  variant="outline" size="sm"
                  onClick={() => setConfirmSeed(true)}
                  disabled={seeding || isAdmin === false}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Importar 4 exemplos
                </Button>
                <Button size="sm" onClick={openNew} disabled={isAdmin === false}>
                  <Plus className="h-4 w-4 mr-2" /> Criar do zero
                </Button>
              </div>
            </div>
          ) : filteredSlides.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Nenhum banner corresponde ao filtro.
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredSlides.map((s) => {
                const idx = sortedSlides.findIndex((x) => x.id === s.id);
                const inWindow = isWindowActive(s);
                const visible = s.is_active && inWindow;
                return (
                  <div
                    key={s.id}
                    className={`group flex items-stretch gap-4 rounded-lg border p-3 transition-all hover:shadow-sm ${
                      visible ? "bg-card" : "bg-muted/30"
                    }`}
                  >
                    <div className="relative w-32 h-20 rounded-md overflow-hidden bg-muted flex-shrink-0">
                      {s.image_url ? (
                        <img src={s.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      {!visible && (
                        <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant="outline" className={`text-[10px] ${KIND_COLOR[s.kind]}`}>
                          {PARTNER_SLIDE_KIND_LABEL[s.kind]}
                        </Badge>
                        {!s.is_active && <Badge variant="secondary" className="text-[10px]">Inativo</Badge>}
                        {s.is_active && !inWindow && (
                          <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/30">
                            Fora da janela
                          </Badge>
                        )}
                        {(s.starts_at || s.ends_at) && (
                          <Badge variant="outline" className="text-[10px] gap-1 font-normal">
                            <Calendar className="h-3 w-3" />
                            {s.starts_at ? new Date(s.starts_at).toLocaleDateString("pt-PT") : "—"}
                            {" → "}
                            {s.ends_at ? new Date(s.ends_at).toLocaleDateString("pt-PT") : "∞"}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground ml-auto">#{s.display_order}</span>
                      </div>
                      {s.eyebrow && <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-0.5">{s.eyebrow}</p>}
                      <p className="font-medium truncate">{s.title}</p>
                      {s.subtitle && <p className="text-sm text-muted-foreground truncate">{s.subtitle}</p>}
                    </div>
                    <div className="flex flex-col items-center justify-center gap-0.5">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => move(s, -1)} disabled={idx === 0 || isAdmin === false} aria-label="Subir">
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => move(s, 1)} disabled={idx === sortedSlides.length - 1 || isAdmin === false} aria-label="Descer">
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="flex flex-col items-center justify-center gap-0.5">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleActive(s)} disabled={isAdmin === false} aria-label={s.is_active ? "Desativar" : "Ativar"}>
                        {s.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(s)} disabled={isAdmin === false} aria-label="Editar">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => duplicate(s)} disabled={isAdmin === false} aria-label="Duplicar">
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8"
                        onClick={() => setConfirmDelete(s)}
                        disabled={isAdmin === false}
                        aria-label="Remover"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar banner" : "Novo banner"}</DialogTitle>
            <DialogDescription>
              Configura o conteúdo, imagem, agendamento e CTA. Vê o preview ao vivo à direita.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="grid md:grid-cols-[1fr_320px] gap-6">
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
                    <Label>Eyebrow <span className="text-muted-foreground font-normal">(etiqueta pequena)</span></Label>
                    <Input
                      value={editing.eyebrow || ""}
                      onChange={(e) => setEditing({ ...editing, eyebrow: e.target.value })}
                      placeholder="Ex.: Campanha do mês · Junho"
                      maxLength={60}
                    />
                  </div>
                  <div>
                    <Label>Título * <span className="text-muted-foreground font-normal text-xs">({(editing.title || "").length}/120)</span></Label>
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
                    <div
                      className={`mt-1 border-2 border-dashed rounded-lg p-4 transition-colors ${
                        dragOver ? "border-primary bg-primary/5" : "border-border"
                      }`}
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOver(false);
                        const f = e.dataTransfer.files?.[0];
                        if (f) handleUpload(f);
                      }}
                    >
                      <div className="flex gap-2">
                        <Input
                          value={editing.image_url || ""}
                          onChange={(e) => setEditing({ ...editing, image_url: e.target.value })}
                          placeholder="https://... ou arrasta uma imagem aqui"
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
                      <p className="text-[11px] text-muted-foreground mt-2">
                        Arrasta imagem para upload rápido · Máx 5MB · JPG, PNG, WebP
                      </p>
                    </div>
                    {editing.image_url && (
                      <div className="mt-3 w-full aspect-[16/9] rounded-lg overflow-hidden bg-muted border relative group">
                        <img src={editing.image_url} alt="Preview" className="w-full h-full object-cover" />
                        <button
                          onClick={() => setEditing({ ...editing, image_url: "" })}
                          className="absolute top-2 right-2 bg-background/80 hover:bg-background rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label="Remover imagem"
                        >
                          <X className="h-4 w-4" />
                        </button>
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
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline" size="sm" type="button"
                      onClick={() => setEditing({ ...editing, starts_at: null, ends_at: null })}
                    >
                      Sempre visível
                    </Button>
                    <Button
                      variant="outline" size="sm" type="button"
                      onClick={() => {
                        const start = new Date();
                        const end = new Date();
                        end.setDate(end.getDate() + 7);
                        setEditing({ ...editing, starts_at: start.toISOString(), ends_at: end.toISOString() });
                      }}
                    >
                      Próximos 7 dias
                    </Button>
                    <Button
                      variant="outline" size="sm" type="button"
                      onClick={() => {
                        const start = new Date();
                        const end = new Date();
                        end.setMonth(end.getMonth() + 1);
                        setEditing({ ...editing, starts_at: start.toISOString(), ends_at: end.toISOString() });
                      }}
                    >
                      Próximo mês
                    </Button>
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
                </TabsContent>
              </Tabs>

              {/* Live preview */}
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Preview ao vivo</Label>
                <div className={`rounded-xl overflow-hidden border shadow-sm ${
                  editing.theme === "dark" ? "bg-slate-900 text-white" : "bg-white text-slate-900"
                }`}>
                  <div className="aspect-[16/9] bg-muted relative">
                    {editing.image_url ? (
                      <img src={editing.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>
                  <div className="p-4 space-y-1.5">
                    {editing.eyebrow && (
                      <p className="text-[10px] uppercase tracking-widest opacity-70">{editing.eyebrow}</p>
                    )}
                    <p className="font-semibold text-sm leading-tight line-clamp-2">
                      {editing.title || <span className="opacity-40">Título do banner</span>}
                    </p>
                    {editing.subtitle && (
                      <p className="text-xs opacity-80 line-clamp-2">{editing.subtitle}</p>
                    )}
                    {editing.cta_label && (
                      <div className="pt-2">
                        <span className={`inline-block text-xs px-3 py-1.5 rounded-md font-medium ${
                          editing.theme === "dark" ? "bg-white text-slate-900" : "bg-slate-900 text-white"
                        }`}>
                          {editing.cta_label}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground text-center">
                  Aparência aproximada no portal
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!editing?.title?.trim() || upsert.isPending}>
              {upsert.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar banner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover banner?</AlertDialogTitle>
            <AlertDialogDescription>
              "{confirmDelete?.title}" será removido permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDelete) remove.mutate(confirmDelete.id);
                setConfirmDelete(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmSeed} onOpenChange={setConfirmSeed}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Importar 4 banners de exemplo?</AlertDialogTitle>
            <AlertDialogDescription>
              Serão criados 4 banners (Campanha, Formação, Lançamento, Educação) que podes editar livremente.
              Os banners ficam ativos imediatamente no portal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={seeding}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={seedSamples} disabled={seeding}>
              {seeding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Importar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
