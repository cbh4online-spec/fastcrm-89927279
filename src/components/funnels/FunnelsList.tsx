import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getPublicBaseUrl } from "@/utils/getPublicDomain";
import { getShareUrl } from "@/utils/getShareUrl";
import {
  Plus, Trash2, Pencil, Globe, GlobeLock, ExternalLink,
  MoreHorizontal, Sparkles, Eye, FileText, TrendingUp,
  Layers, Copy, Check, Wand2, Target, Zap, BarChart3, DollarSign, Coins
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useFunnels, useCreateFunnel, useDeleteFunnel } from "@/hooks/useFunnels";
import { useVerticals, useCreateVertical, useDeleteVertical } from "@/hooks/useVerticals";
import { useVerticalTemplates, useDeleteVerticalTemplate } from "@/hooks/useVerticalTemplates";
import { useAllVerticalKPIs } from "@/hooks/useVerticalLandingAnalytics";
import { useFunnelInstances, useCaptureTypes } from "@/hooks/useFunnelInstances";
import { verticalConfigs } from "@/config/verticalConfigs";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { FunnelBuilder } from "./FunnelBuilder";
import { VerticalView } from "./VerticalView";
import { VerticalTemplateBuilder } from "@/components/landing-pages/VerticalTemplateBuilder";
import { VerticalFunnelManager } from "./VerticalFunnelManager";
import { AIFunnelBuilder } from "./ai-builder/AIFunnelBuilder";
import { DomainManager } from "./domains/DomainManager";
import { CreditWalletBadge } from "./credits/CreditWalletBadge";
import { CreditLedgerPanel } from "./credits/CreditLedgerPanel";
import { CreditPurchasePanel } from "./credits/CreditPurchasePanel";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";

export function FunnelsList() {
  const { data: funnels, isLoading } = useFunnels();
  const createFunnel = useCreateFunnel();
  const deleteFunnel = useDeleteFunnel();
  const { currentWorkspace } = useWorkspace();
  const isMetodoPare = currentWorkspace?.slug === "metodopare";

  const { data: verticals = [] } = useVerticals();
  const createVertical = useCreateVertical();
  const deleteVertical = useDeleteVertical();

  const { data: customTemplates } = useVerticalTemplates();
  const deleteTemplate = useDeleteVerticalTemplate();
  const { data: kpis } = useAllVerticalKPIs();

  const { data: funnelInstances = [] } = useFunnelInstances();
  const { data: captureTypes = [] } = useCaptureTypes();

  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingFunnelId, setEditingFunnelId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");

  // Vertical state
  const [createVerticalOpen, setCreateVerticalOpen] = useState(false);
  const [verticalName, setVerticalName] = useState("");
  const [verticalSlug, setVerticalSlug] = useState("");
  const [verticalDesc, setVerticalDesc] = useState("");
  const [verticalColor, setVerticalColor] = useState("#6366f1");
  const [activeVerticalId, setActiveVerticalId] = useState<string | null>(null);
  const [deleteVerticalId, setDeleteVerticalId] = useState<string | null>(null);

  // AIDA template state
  const [builderMode, setBuilderMode] = useState<"new" | null>(null);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [managingTemplateId, setManagingTemplateId] = useState<string | null>(null);
  const [managingSlug, setManagingSlug] = useState<string | null>(null);
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  // AI Builder state
  const [showAIBuilder, setShowAIBuilder] = useState(false);

  // Active tab for homepage
  const [activeHomeTab, setActiveHomeTab] = useState("overview");

  const handleCopyShareLink = (type: string, slug: string) => {
    const url = getShareUrl(type, slug);
    navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  const handleCreate = async () => {
    if (!newName || !newSlug) return;
    const result = await createFunnel.mutateAsync({ name: newName, slug: newSlug });
    setCreateOpen(false);
    setNewName("");
    setNewSlug("");
    setEditingFunnelId(result.id);
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteFunnel.mutate(deleteId);
      setDeleteId(null);
    }
  };

  const handleCreateVertical = async () => {
    if (!verticalName || !verticalSlug) return;
    await createVertical.mutateAsync({
      name: verticalName,
      slug: verticalSlug,
      description: verticalDesc || undefined,
      color_theme: verticalColor,
    });
    setCreateVerticalOpen(false);
    setVerticalName("");
    setVerticalSlug("");
    setVerticalDesc("");
    setVerticalColor("#6366f1");
  };

  const handleDeleteTemplate = () => {
    if (deleteTemplateId) {
      deleteTemplate.mutate(deleteTemplateId);
      setDeleteTemplateId(null);
    }
  };

  const getVerticalPublicUrl = (slug: string) => {
    return `${getPublicBaseUrl()}/${slug}`;
  };

  // Funnels without vertical
  const unassignedFunnels = funnels?.filter((f) => !f.vertical_id) || [];

  // Published items (funnels + templates + instances)
  const publishedFunnelsList = funnels?.filter((f) => f.is_published) || [];
  const publishedInstances = funnelInstances.filter((fi) => fi.status === "published");
  const publishedTemplates = customTemplates?.filter((t: any) => t.is_published) || [];
  const allPublished = [
    ...publishedFunnelsList.map((f) => ({ id: f.id, type: "funnel" as const, name: f.name, slug: f.slug, updatedAt: f.updated_at })),
    ...publishedInstances.map((fi) => ({ id: fi.id, type: "instance" as const, name: fi.name, slug: fi.slug || fi.path || "", updatedAt: fi.created_at })),
    ...publishedTemplates.map((t: any) => ({ id: t.id, type: "template" as const, name: t.name, slug: t.slug, updatedAt: t.updated_at || t.created_at })),
  ];

  // Show AI Builder
  if (showAIBuilder) {
    return (
      <AIFunnelBuilder
        onBack={() => setShowAIBuilder(false)}
        onApply={async (rec) => {
          try {
            const result = await createFunnel.mutateAsync({
              name: rec.headline || rec.vertical || "Funil IA",
              slug: rec.slug || `funil-ia-${Date.now()}`,
            });
            if (result?.id && rec.funnelSteps?.length) {
              // Remove default steps
              await supabase.from("funnel_steps").delete().eq("funnel_id", result.id);
              // Insert AI-recommended steps
              await supabase.from("funnel_steps").insert(
                rec.funnelSteps.map((step, i) => ({
                  funnel_id: result.id,
                  workspace_id: currentWorkspace!.id,
                  name: step.name,
                  step_type: step.type || "page",
                  sort_order: i,
                }))
              );
            }
            setShowAIBuilder(false);
            if (result?.id) {
              setEditingFunnelId(result.id);
            }
            toast.success("Funil criado com sucesso!");
          } catch (e: any) {
            toast.error("Erro ao criar funil: " + (e?.message || "Erro desconhecido"));
          }
        }}
      />
    );
  }

  // Show vertical view
  if (activeVerticalId) {
    return <VerticalView verticalId={activeVerticalId} onBack={() => setActiveVerticalId(null)} />;
  }

  // Show vertical funnel manager (custom DB template or static)
  if (managingTemplateId || managingSlug) {
    return (
      <VerticalFunnelManager
        templateId={managingTemplateId ?? undefined}
        slug={managingSlug ?? undefined}
        onBack={() => { setManagingTemplateId(null); setManagingSlug(null); }}
      />
    );
  }

  // Show AIDA builder for new templates
  if (builderMode) {
    return (
      <VerticalTemplateBuilder
        onBack={() => setBuilderMode(null)}
      />
    );
  }

  // Show funnel builder
  if (editingFunnelId) {
    return <FunnelBuilder funnelId={editingFunnelId} onBack={() => setEditingFunnelId(null)} />;
  }

  // KPI summary
  const totalFunnels = (funnels?.length || 0) + funnelInstances.length;
  const publishedFunnels = (funnels?.filter(f => f.is_published).length || 0) +
    funnelInstances.filter(f => f.status === "published").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Funis</h1>
            <p className="text-sm text-muted-foreground">
              Constrói funis de conversão inteligentes com IA, templates e domínios próprios
            </p>
          </div>
          <CreditWalletBadge />
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <Button
            onClick={() => setShowAIBuilder(true)}
            className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
          >
            <Wand2 className="h-4 w-4" />
            Criar Funil com IA
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Novo
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-background border shadow-lg z-50">
              <DropdownMenuItem onClick={() => setCreateOpen(true)}>
                <FileText className="h-4 w-4 mr-2" />
                Novo Funil Manual
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCreateVerticalOpen(true)}>
                <Layers className="h-4 w-4 mr-2" />
                Nova Vertical
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setBuilderMode("new")}>
                <Sparkles className="h-4 w-4 mr-2" />
                Novo Template AIDA
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex sm:hidden items-center gap-2">
          <Button className="flex-1 gap-2" onClick={() => setShowAIBuilder(true)}>
            <Wand2 className="h-4 w-4" />
            Criar com IA
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-background border shadow-lg z-50">
              <DropdownMenuItem onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Funil Manual
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCreateVerticalOpen(true)}>
                <Layers className="h-4 w-4 mr-2" />
                Nova Vertical
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setBuilderMode("new")}>
                <Sparkles className="h-4 w-4 mr-2" />
                Novo Template AIDA
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalFunnels}</p>
                <p className="text-xs text-muted-foreground">Total Funis</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Globe className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{publishedFunnels}</p>
                <p className="text-xs text-muted-foreground">Publicados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Layers className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{verticals.length}</p>
                <p className="text-xs text-muted-foreground">Verticais</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <Zap className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{captureTypes.length}</p>
                <p className="text-xs text-muted-foreground">Tipos de Captura</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Homepage Tabs */}
      <Tabs value={activeHomeTab} onValueChange={setActiveHomeTab}>
        <div className="overflow-x-auto -mx-1 px-1">
          <TabsList className="flex w-max min-w-full">
            <TabsTrigger value="overview" className="gap-1.5">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Visão Geral</span>
              <span className="sm:hidden">Geral</span>
            </TabsTrigger>
            <TabsTrigger value="verticals" className="gap-1.5">
              <Layers className="h-4 w-4" />
              Verticais
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-1.5">
              <Sparkles className="h-4 w-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="capture" className="gap-1.5">
              <Target className="h-4 w-4" />
              Captura
            </TabsTrigger>
            <TabsTrigger value="domains" className="gap-1.5">
              <Globe className="h-4 w-4" />
              Domínios
            </TabsTrigger>
            <TabsTrigger value="credits" className="gap-1.5">
              <Coins className="h-4 w-4" />
              Créditos
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-4 space-y-6">
          {/* AI CTA Card */}
          <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5">
            <CardContent className="flex flex-col sm:flex-row items-center gap-6 py-8 px-6">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <Wand2 className="h-10 w-10 text-primary" />
              </div>
              <div className="text-center sm:text-left flex-1">
                <h3 className="text-xl font-bold mb-1">Construir Funil com IA</h3>
                <p className="text-sm text-muted-foreground max-w-lg">
                  Descreve o que queres vender e a IA constrói o funil completo — vertical, template, captura, 
                  automações, tracking e domínio. Tudo pronto para publicar.
                </p>
              </div>
              <Button
                size="lg"
                className="gap-2 bg-gradient-to-r from-primary to-primary/80 shrink-0"
                onClick={() => setShowAIBuilder(true)}
              >
                <Wand2 className="h-5 w-5" />
                Começar
              </Button>
            </CardContent>
          </Card>

          {/* Funnels list */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Funis Activos</h2>

            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader className="h-20 bg-muted" />
                    <CardContent className="space-y-2 pt-4">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : !unassignedFunnels.length && !funnelInstances.length ? (
              <Card className="overflow-hidden">
                <div className="bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 flex flex-col items-center justify-center py-16 px-6 text-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                    <Globe className="h-10 w-10 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xl mb-1">Sem funis criados</h3>
                    <p className="text-muted-foreground text-sm max-w-xs">
                      Cria o teu primeiro funil com IA ou manualmente e começa a converter visitantes em clientes.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="lg" onClick={() => setShowAIBuilder(true)} className="gap-2">
                      <Wand2 className="h-4 w-4" />
                      Criar com IA
                    </Button>
                    <Button size="lg" variant="outline" onClick={() => setCreateOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Manual
                    </Button>
                  </div>
                </div>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* V2 Funnel Instances */}
                {funnelInstances.map((fi) => (
                  <Card key={fi.id} className="group hover:shadow-md transition-shadow cursor-pointer">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-lg">{fi.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">/{fi.slug || fi.path || "—"}</p>
                        </div>
                        <Badge variant={fi.status === "published" ? "default" : "secondary"}>
                          {fi.status === "published" ? (
                            <><Globe className="h-3 w-3 mr-1" />Publicado</>
                          ) : (
                            <><GlobeLock className="h-3 w-3 mr-1" />Rascunho</>
                          )}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {fi.objective && (
                        <Badge variant="outline" className="text-xs">{fi.objective}</Badge>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Criado {formatDistanceToNow(new Date(fi.created_at), { addSuffix: true, locale: pt })}
                      </p>
                    </CardContent>
                  </Card>
                ))}

                {/* Legacy Funnels */}
                {unassignedFunnels.map((funnel) => (
                  <Card
                    key={funnel.id}
                    className="group hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setEditingFunnelId(funnel.id)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-lg">{funnel.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">/{funnel.slug}</p>
                        </div>
                        <Badge variant={funnel.is_published ? "default" : "secondary"}>
                          {funnel.is_published ? (
                            <><Globe className="h-3 w-3 mr-1" />Publicado</>
                          ) : (
                            <><GlobeLock className="h-3 w-3 mr-1" />Rascunho</>
                          )}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-xs text-muted-foreground">
                        Atualizado {formatDistanceToNow(new Date(funnel.updated_at), { addSuffix: true, locale: pt })}
                      </p>
                      <div className="flex items-center gap-2 pt-2 border-t" onClick={(e) => e.stopPropagation()}>
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => setEditingFunnelId(funnel.id)}>
                          <Pencil className="h-3 w-3 mr-1" />
                          Editar
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setDeleteId(funnel.id)} className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Verticals Tab */}
        <TabsContent value="verticals" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Verticais</h2>
            <Button variant="outline" onClick={() => setCreateVerticalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Vertical
            </Button>
          </div>

          {verticals.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Layers className="h-10 w-10 text-muted-foreground mb-3" />
                <h3 className="font-semibold mb-1">Sem verticais</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Verticais organizam os teus funis por mercado ou segmento.
                </p>
                <Button onClick={() => setCreateVerticalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Vertical
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {verticals.map((v) => {
                const funnelCount = funnels?.filter((f) => f.vertical_id === v.id).length ?? 0;
                return (
                  <Card
                    key={v.id}
                    className="group hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setActiveVerticalId(v.id)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-4 h-4 rounded-full shrink-0"
                            style={{ backgroundColor: v.color_theme || "#6366f1" }}
                          />
                          <div>
                            <CardTitle className="text-lg">{v.name}</CardTitle>
                            <p className="text-sm text-muted-foreground">/{v.slug}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">{funnelCount} funis</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {v.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{v.description}</p>
                      )}
                      <div className="flex items-center gap-2 pt-2 border-t" onClick={(e) => e.stopPropagation()}>
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => setActiveVerticalId(v.id)}>
                          <Pencil className="h-3 w-3 mr-1" />
                          Abrir
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteVerticalId(v.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Templates de Página (AIDA)</h2>
            <Button variant="outline" onClick={() => setBuilderMode("new")}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Template
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Static templates */}
            {isMetodoPare && Object.values(verticalConfigs).map((vertical) => (
              <Card key={vertical.slug} className="group hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{vertical.nome}</CardTitle>
                      <p className="text-sm text-muted-foreground">/{vertical.slug}</p>
                    </div>
                    <Badge
                      className="text-xs"
                      style={{ backgroundColor: vertical.cores.accent, color: "#fff" }}
                    >
                      AIDA
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {vertical.dor_principal}
                  </p>
                  {kpis?.[vertical.slug] && (
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{kpis[vertical.slug].views}</span>
                      <span className="flex items-center gap-1"><FileText className="h-3 w-3" />{kpis[vertical.slug].submissions}</span>
                      <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" />{kpis[vertical.slug].conversionRate.toFixed(1)}%</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      <Globe className="h-3 w-3 mr-1" />
                      Publicado
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {vertical.modulos_ativos.length} módulos
                    </span>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => setManagingSlug(vertical.slug)}>
                      <Pencil className="h-3 w-3 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(getVerticalPublicUrl(vertical.slug), "_blank")}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Abrir
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleCopyShareLink("vertical", vertical.slug)}
                    >
                      {copiedSlug === vertical.slug ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {/* Custom templates from DB */}
            {customTemplates?.map((tpl) => (
              <Card key={tpl.id} className="group hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{tpl.nome}</CardTitle>
                      <p className="text-sm text-muted-foreground">/{tpl.slug}</p>
                    </div>
                    <div className="flex gap-1">
                      <Badge variant="secondary" className="text-xs">Custom</Badge>
                      <Badge
                        className="text-xs"
                        style={{ backgroundColor: (tpl.cores as any)?.accent || "hsl(250,83%,60%)", color: "#fff" }}
                      >
                        AIDA
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {tpl.dor_principal}
                  </p>
                  {kpis?.[tpl.slug] && (
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{kpis[tpl.slug].views}</span>
                      <span className="flex items-center gap-1"><FileText className="h-3 w-3" />{kpis[tpl.slug].submissions}</span>
                      <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" />{kpis[tpl.slug].conversionRate.toFixed(1)}%</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Badge variant={tpl.is_published ? "outline" : "secondary"} className="text-xs">
                      {tpl.is_published ? (
                        <><Globe className="h-3 w-3 mr-1" />Publicado</>
                      ) : (
                        <><GlobeLock className="h-3 w-3 mr-1" />Rascunho</>
                      )}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => setManagingTemplateId(tpl.id)}>
                      <Pencil className="h-3 w-3 mr-1" />
                      Editar
                    </Button>
                    {tpl.is_published && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(getVerticalPublicUrl(tpl.slug), "_blank")}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Abrir
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleCopyShareLink("vertical", tpl.slug)}
                    >
                      {copiedSlug === tpl.slug ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteTemplateId(tpl.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Capture Types Tab */}
        <TabsContent value="capture" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Tipos de Captura</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {captureTypes.map((ct) => (
              <Card key={ct.id} className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Target className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">{ct.label}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{ct.description}</p>
                      <Badge variant="outline" className="text-[10px] mt-2">{ct.key}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Domains Tab */}
        <TabsContent value="domains" className="mt-4">
          <DomainManager />
        </TabsContent>

        {/* Credits Tab */}
        <TabsContent value="credits" className="mt-4 space-y-6">
          <CreditPurchasePanel />
          <CreditLedgerPanel />
        </TabsContent>
      </Tabs>

      {/* Create Funnel Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Funil</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value);
                  setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));
                }}
                placeholder="Ex: Digital Marketing"
              />
            </div>
            <div>
              <Label>Slug (URL)</Label>
              <Input value={newSlug} onChange={(e) => setNewSlug(e.target.value)} placeholder="digital-marketing" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!newName || !newSlug || createFunnel.isPending}>
              Criar Funil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Vertical Dialog */}
      <Dialog open={createVerticalOpen} onOpenChange={setCreateVerticalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Vertical</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input
                value={verticalName}
                onChange={(e) => {
                  setVerticalName(e.target.value);
                  setVerticalSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));
                }}
                placeholder="Ex: Clínicas Dentárias"
              />
            </div>
            <div>
              <Label>Slug</Label>
              <Input value={verticalSlug} onChange={(e) => setVerticalSlug(e.target.value)} placeholder="clinicas-dentarias" />
            </div>
            <div>
              <Label>Descrição (opcional)</Label>
              <Textarea
                value={verticalDesc}
                onChange={(e) => setVerticalDesc(e.target.value)}
                placeholder="Funis focados em clínicas dentárias..."
                rows={2}
              />
            </div>
            <div>
              <Label>Cor</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={verticalColor}
                  onChange={(e) => setVerticalColor(e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer border-0"
                />
                <Input value={verticalColor} onChange={(e) => setVerticalColor(e.target.value)} className="flex-1" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateVerticalOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateVertical} disabled={!verticalName || !verticalSlug || createVertical.isPending}>
              Criar Vertical
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Funnel Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Funil</AlertDialogTitle>
            <AlertDialogDescription>
              Isto irá eliminar permanentemente este funil e todos os seus steps.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Vertical Dialog */}
      <AlertDialog open={!!deleteVerticalId} onOpenChange={() => setDeleteVerticalId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Vertical</AlertDialogTitle>
            <AlertDialogDescription>
              Isto irá eliminar esta vertical. Os funis associados ficarão sem vertical.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deleteVerticalId) { deleteVertical.mutate(deleteVerticalId); setDeleteVerticalId(null); } }}
              className="bg-destructive text-destructive-foreground"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Template Dialog */}
      <AlertDialog open={!!deleteTemplateId} onOpenChange={() => setDeleteTemplateId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Template AIDA</AlertDialogTitle>
            <AlertDialogDescription>
              Isto irá eliminar permanentemente este template vertical. Esta acção não pode ser revertida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTemplate} className="bg-destructive text-destructive-foreground">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
