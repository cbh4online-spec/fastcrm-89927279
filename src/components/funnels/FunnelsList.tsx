import { useState } from "react";
import { getPublicBaseUrl } from "@/utils/getPublicDomain";
import { Plus, Trash2, Pencil, Globe, GlobeLock, ExternalLink, MoreHorizontal, Sparkles, Eye, FileText, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useVerticalTemplates, useDeleteVerticalTemplate } from "@/hooks/useVerticalTemplates";
import { useAllVerticalKPIs } from "@/hooks/useVerticalLandingAnalytics";
import { verticalConfigs } from "@/config/verticalConfigs";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { FunnelBuilder } from "./FunnelBuilder";
import { VerticalTemplateBuilder } from "@/components/landing-pages/VerticalTemplateBuilder";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

export function FunnelsList() {
  const { data: funnels, isLoading } = useFunnels();
  const createFunnel = useCreateFunnel();
  const deleteFunnel = useDeleteFunnel();
  const { currentWorkspace } = useWorkspace();

  const { data: customTemplates } = useVerticalTemplates();
  const deleteTemplate = useDeleteVerticalTemplate();
  const { data: kpis } = useAllVerticalKPIs();

  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingFunnelId, setEditingFunnelId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");

  // AIDA template state
  const [builderMode, setBuilderMode] = useState<"new" | "edit" | null>(null);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);

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

  const handleDeleteTemplate = () => {
    if (deleteTemplateId) {
      deleteTemplate.mutate(deleteTemplateId);
      setDeleteTemplateId(null);
    }
  };

  const getVerticalPublicUrl = (slug: string) => {
    return `${getPublicBaseUrl()}/${slug}`;
  };

  // Show AIDA builder
  if (builderMode) {
    return (
      <VerticalTemplateBuilder
        templateId={builderMode === "edit" ? editingTemplateId : undefined}
        onBack={() => {
          setBuilderMode(null);
          setEditingTemplateId(null);
        }}
      />
    );
  }

  // Show funnel builder
  if (editingFunnelId) {
    return <FunnelBuilder funnelId={editingFunnelId} onBack={() => setEditingFunnelId(null)} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Funis</h1>
          <p className="text-muted-foreground">Cria e gere funis de conversão multi-step e templates AIDA</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setBuilderMode("new")}>
            <Sparkles className="h-4 w-4 mr-2" />
            Novo Template AIDA
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Funil
          </Button>
        </div>
      </div>

      {/* Templates Verticais AIDA */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="text-lg font-semibold">Templates Verticais (AIDA)</h2>
          <Badge variant="secondary" className="text-xs">
            {Object.keys(verticalConfigs).length + (customTemplates?.length ?? 0)} activos
          </Badge>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Static templates */}
          {Object.values(verticalConfigs).map((vertical) => (
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
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => window.open(getVerticalPublicUrl(vertical.slug), "_blank")}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Abrir
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
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setEditingTemplateId(tpl.id);
                      setBuilderMode("edit");
                    }}
                  >
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
      </div>

      {/* Funis Multi-step */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Funis Multi-step</h2>

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
        ) : !funnels?.length ? (
          <Card className="flex flex-col items-center justify-center py-16">
            <Globe className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">Sem funis</h3>
            <p className="text-muted-foreground mb-4">Cria o teu primeiro funil de conversão</p>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Funil
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {funnels.map((funnel) => (
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
