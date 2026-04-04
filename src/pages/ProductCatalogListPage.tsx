import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, BookOpen, Trash2, ExternalLink, Copy, Edit } from "lucide-react";
import { useProductCatalogs, useCreateCatalog, useDeleteCatalog } from "@/hooks/useProductCatalogs";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toSlug } from "@/utils/slug";
import { toast } from "sonner";

export default function ProductCatalogListPage() {
  const { currentWorkspace } = useWorkspace();
  const { data: catalogs, isLoading } = useProductCatalogs(currentWorkspace?.id);
  const createCatalog = useCreateCatalog();
  const deleteCatalog = useDeleteCatalog();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");

  const handleCreate = async () => {
    if (!currentWorkspace || !title.trim()) return;
    const slug = toSlug(title);
    const result = await createCatalog.mutateAsync({
      workspace_id: currentWorkspace.id,
      title: title.trim(),
      slug,
    });
    setShowCreate(false);
    setTitle("");
    navigate(`/dashboard/store-catalogs/${result.id}/edit`);
  };

  const copyLink = (slug: string) => {
    const ws = currentWorkspace as any;
    const url = `${window.location.origin}/store/${ws?.slug || ""}/catalog/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado");
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Catálogos de Produtos</h1>
          <p className="text-sm text-muted-foreground">Crie catálogos visuais folheáveis para os seus produtos</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" /> Novo Catálogo
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse"><CardContent className="p-6 h-40" /></Card>
          ))}
        </div>
      ) : !catalogs?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold mb-1">Nenhum catálogo</h3>
            <p className="text-sm text-muted-foreground mb-4">Crie o seu primeiro catálogo digital de produtos</p>
            <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" /> Criar Catálogo</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {catalogs.map((cat) => (
            <Card key={cat.id} className="group hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{cat.title}</h3>
                    {cat.subtitle && <p className="text-xs text-muted-foreground truncate">{cat.subtitle}</p>}
                  </div>
                  <Badge variant={cat.status === "published" ? "default" : "secondary"} className="ml-2 text-[10px]">
                    {cat.status === "published" ? "Publicado" : "Rascunho"}
                  </Badge>
                </div>
                {cat.cover_image && (
                  <div className="w-full h-32 rounded-lg overflow-hidden mb-3 bg-muted/30">
                    <img src={cat.cover_image} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <p className="text-xs text-muted-foreground mb-3">
                  Atualizado: {new Date(cat.updated_at).toLocaleDateString("pt-PT")}
                </p>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => navigate(`/dashboard/store-catalogs/${cat.id}/edit`)}>
                    <Edit className="h-3.5 w-3.5 mr-1" /> Editar
                  </Button>
                  {cat.status === "published" && (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => copyLink(cat.slug)} title="Copiar link">
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" asChild title="Abrir">
                        <a href={`/store/${(currentWorkspace as any)?.slug || ""}/catalog/${cat.slug}`} target="_blank" rel="noopener">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    </>
                  )}
                  <Button size="sm" variant="ghost" className="text-destructive ml-auto" onClick={() => deleteCatalog.mutate(cat.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Catálogo</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Título</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Catálogo Primavera 2026" />
            </div>
            {title && <p className="text-xs text-muted-foreground">Slug: {toSlug(title)}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!title.trim() || createCatalog.isPending}>
              {createCatalog.isPending ? "A criar..." : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
