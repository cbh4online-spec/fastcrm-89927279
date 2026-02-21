import { useState } from "react";
import { getPublicBaseUrl } from "@/utils/getPublicDomain";
import { getShareUrl } from "@/utils/getShareUrl";
import { Plus, Globe, GlobeLock, Trash2, Pencil, ExternalLink, Sparkles, Eye, FileText, TrendingUp, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { useLandingPages, useDeleteLandingPage, usePublishLandingPage } from "@/hooks/useLandingPages";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { CreateLandingPageDialog } from "./CreateLandingPageDialog";
import { LandingPageBuilder } from "./LandingPageBuilder";
import { VerticalTemplateBuilder } from "./VerticalTemplateBuilder";
import { formatDistanceToNow } from "date-fns";
import { verticalConfigs } from "@/config/verticalConfigs";
import { useVerticalTemplates, useDeleteVerticalTemplate } from "@/hooks/useVerticalTemplates";
import { useAllVerticalKPIs } from "@/hooks/useVerticalLandingAnalytics";

export function LandingPagesList() {
  const { data: pages, isLoading } = useLandingPages();
  const deletePage = useDeleteLandingPage();
  const publishPage = usePublishLandingPage();
  const { currentWorkspace } = useWorkspace();

  const { data: customTemplates } = useVerticalTemplates();
  const deleteTemplate = useDeleteVerticalTemplate();
  const { data: kpis } = useAllVerticalKPIs();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [deletePageId, setDeletePageId] = useState<string | null>(null);
  const [builderMode, setBuilderMode] = useState<"new" | "edit" | null>(null);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const handleCopyShareLink = (type: string, slug: string) => {
    const url = getShareUrl(type, slug);
    navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  const handleDelete = () => {
    if (deletePageId) {
      deletePage.mutate(deletePageId);
      setDeletePageId(null);
    }
  };

  const handleTogglePublish = (id: string, currentlyPublished: boolean) => {
    publishPage.mutate({ id, publish: !currentlyPublished });
  };

  const getPublicUrl = (slug: string) => {
    return `${getPublicBaseUrl()}/p/${currentWorkspace?.slug}/${slug}`;
  };

  const getVerticalPublicUrl = (slug: string) => {
    return `${getPublicBaseUrl()}/${slug}`;
  };

  const handleDeleteTemplate = () => {
    if (deleteTemplateId) {
      deleteTemplate.mutate(deleteTemplateId);
      setDeleteTemplateId(null);
    }
  };

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

  if (editingPageId) {
    return (
      <LandingPageBuilder
        pageId={editingPageId}
        onBack={() => setEditingPageId(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Landing Pages</h1>
          <p className="text-muted-foreground">Create conversion-focused landing pages</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setBuilderMode("new")}>
            <Sparkles className="h-4 w-4 mr-2" />
            Novo Template AIDA
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Page
          </Button>
        </div>
      </div>

      {/* Templates Verticais AIDA */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="text-lg font-semibold">Templates Verticais (AIDA)</h2>
          <Badge variant="secondary" className="text-xs">{Object.keys(verticalConfigs).length + (customTemplates?.length ?? 0)} activos</Badge>
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
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleCopyShareLink("vertical", vertical.slug)}
                    title="Copiar link de partilha"
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
                      onClick={() => window.open(`${getPublicBaseUrl()}/${tpl.slug}`, "_blank")}
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
                    title="Copiar link de partilha"
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
      </div>

      {/* Páginas Customizadas */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Páginas Customizadas</h2>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-24 bg-muted" />
              <CardContent className="space-y-2 pt-4">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : pages?.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-12">
          <Globe className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">No landing pages yet</h3>
          <p className="text-muted-foreground mb-4">Create your first landing page to start capturing leads</p>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Landing Page
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pages?.map((page) => (
            <Card key={page.id} className="group hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg line-clamp-1">{page.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">/{page.slug}</p>
                  </div>
                  <Badge variant={page.is_published ? "default" : "secondary"}>
                    {page.is_published ? (
                      <>
                        <Globe className="h-3 w-3 mr-1" />
                        Published
                      </>
                    ) : (
                      <>
                        <GlobeLock className="h-3 w-3 mr-1" />
                        Draft
                      </>
                    )}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {page.headline && (
                  <p className="text-sm line-clamp-2">{page.headline}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Updated {formatDistanceToNow(new Date(page.updated_at), { addSuffix: true })}
                </p>
                <div className="flex items-center gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingPageId(page.id)}
                    className="flex-1"
                  >
                    <Pencil className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant={page.is_published ? "secondary" : "default"}
                    size="sm"
                    onClick={() => handleTogglePublish(page.id, !!page.is_published)}
                    className="flex-1"
                  >
                    {page.is_published ? "Unpublish" : "Publish"}
                  </Button>
                  {page.is_published && (
                    <>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => window.open(getPublicUrl(page.slug), "_blank")}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleCopyShareLink("landing", `${currentWorkspace?.slug}/${page.slug}`)}
                      title="Copiar link de partilha"
                    >
                      {copiedSlug === `${currentWorkspace?.slug}/${page.slug}` ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    </>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeletePageId(page.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      </div>

      <CreateLandingPageDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreated={(id) => {
          setCreateDialogOpen(false);
          setEditingPageId(id);
        }}
      />

      <AlertDialog open={!!deletePageId} onOpenChange={() => setDeletePageId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Landing Page</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this landing page. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
