import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ModuleGuard } from "@/components/guards/ModuleGuard";
import { useBioPages, useCreateBioPage, useDeleteBioPage, usePublishBioPage } from "@/hooks/useBioPages";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Globe, Eye, Trash2, ExternalLink, PenLine } from "lucide-react";
import { BioPageBuilder } from "@/components/bio/BioPageBuilder";

function BioOSContent() {
  const { data: pages = [], isLoading } = useBioPages();
  const createPage = useCreateBioPage();
  const deletePage = useDeleteBioPage();
  const publishPage = usePublishBioPage();
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");

  if (selectedPageId) {
    return (
      <DashboardLayout>
        <BioPageBuilder pageId={selectedPageId} onBack={() => setSelectedPageId(null)} />
      </DashboardLayout>
    );
  }

  const handleCreate = async () => {
    if (!newName.trim() || !newSlug.trim()) return;
    await createPage.mutateAsync({ name: newName.trim(), slug: newSlug.trim().toLowerCase().replace(/\s+/g, "-") });
    setDialogOpen(false);
    setNewName("");
    setNewSlug("");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Bio OS</h1>
            <p className="text-muted-foreground text-sm">Crie páginas bio e micro-sites com tracking integrado</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Nova Página</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Página Bio</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <label className="text-sm font-medium">Nome</label>
                  <Input value={newName} onChange={(e) => { setNewName(e.target.value); setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")); }} placeholder="Ex: Jorge Cardoso Digital" />
                </div>
                <div>
                  <label className="text-sm font-medium">Slug (URL)</label>
                  <Input value={newSlug} onChange={(e) => setNewSlug(e.target.value)} placeholder="jorge-cardoso-digital" />
                  <p className="text-xs text-muted-foreground mt-1">/b/workspace/{newSlug || "..."}</p>
                </div>
                <Button onClick={handleCreate} disabled={createPage.isPending} className="w-full">
                  {createPage.isPending ? "A criar..." : "Criar Página"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="text-center text-muted-foreground py-12">A carregar...</div>
        ) : pages.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Globe className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-semibold mb-1">Nenhuma página Bio</h3>
              <p className="text-sm text-muted-foreground mb-4">Crie a sua primeira página bio para partilhar nas redes sociais.</p>
              <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" /> Criar Página</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pages.map((page) => (
              <Card key={page.id} className="group hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedPageId(page.id)}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">{page.name}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1 truncate">/{page.slug}</p>
                    </div>
                    <Badge variant={page.status === "live" ? "default" : "secondary"} className="ml-2 shrink-0">
                      {page.status === "live" ? "Live" : "Draft"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-1 mt-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setSelectedPageId(page.id); }}>
                      <PenLine className="h-4 w-4" />
                    </Button>
                    {page.status === "live" && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); window.open(`/b/${page.workspace_id}/${page.slug}`, "_blank"); }}>
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => {
                      e.stopPropagation();
                      publishPage.mutate({ id: page.id, status: page.status === "live" ? "draft" : "live" });
                    }}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Eliminar esta página?")) deletePage.mutate(page.id);
                    }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default function BioOS() {
  return (
    <ModuleGuard moduleSlug="bio-os" moduleName="Bio OS">
      <BioOSContent />
    </ModuleGuard>
  );
}
