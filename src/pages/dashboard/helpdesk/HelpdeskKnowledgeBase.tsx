import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Search, Pencil, Trash2, Eye, EyeOff, BookOpen, FolderOpen } from "lucide-react";
import { useKBAdmin, type KBArticle, type KBCategory } from "@/hooks/useKBAdmin";
import { KBArticleEditor } from "@/components/helpdesk/KBArticleEditor";
import TimeAgo from "react-timeago";
import Skeleton from "react-loading-skeleton";

const TYPE_LABELS: Record<string, string> = {
  guide: "Guia",
  "how-to": "How-to",
  reference: "Referência",
  faq: "FAQ",
  video: "Vídeo",
};

export default function HelpdeskKnowledgeBase() {
  const {
    categories, isLoadingCategories, createCategory, updateCategory, deleteCategory,
    articles, isLoadingArticles, createArticle, updateArticle, togglePublish, deleteArticle,
  } = useKBAdmin();

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<KBArticle | null>(null);

  // Category dialog
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<KBCategory | null>(null);
  const [catTitle, setCatTitle] = useState("");
  const [catSlug, setCatSlug] = useState("");
  const [catIcon, setCatIcon] = useState("BookOpen");
  const [catColor, setCatColor] = useState("#3b82f6");
  const [catDesc, setCatDesc] = useState("");

  // Filtered articles
  const filtered = useMemo(() => {
    let items = articles;
    if (filterCategory !== "all") items = items.filter((a) => a.category_slug === filterCategory);
    if (filterType !== "all") items = items.filter((a) => a.article_type === filterType);
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter((a) => a.title.toLowerCase().includes(q) || a.summary.toLowerCase().includes(q));
    }
    return items;
  }, [articles, filterCategory, filterType, search]);

  const openNewArticle = () => { setEditingArticle(null); setEditorOpen(true); };
  const openEditArticle = (a: KBArticle) => { setEditingArticle(a); setEditorOpen(true); };

  const openNewCategory = () => {
    setEditingCat(null);
    setCatTitle(""); setCatSlug(""); setCatIcon("BookOpen"); setCatColor("#3b82f6"); setCatDesc("");
    setCatDialogOpen(true);
  };
  const openEditCategory = (c: KBCategory) => {
    setEditingCat(c);
    setCatTitle(c.title); setCatSlug(c.slug); setCatIcon(c.icon); setCatColor(c.color); setCatDesc(c.description || "");
    setCatDialogOpen(true);
  };

  const saveCategory = () => {
    const payload = { title: catTitle, slug: catSlug || catTitle.toLowerCase().replace(/\s+/g, "-"), icon: catIcon, color: catColor, description: catDesc || null, sort_order: editingCat?.sort_order ?? categories.length };
    if (editingCat) {
      updateCategory.mutate({ id: editingCat.id, ...payload });
    } else {
      createCategory.mutate(payload as any);
    }
    setCatDialogOpen(false);
  };

  const handleSaveArticle = (data: any) => {
    if (data.id) {
      updateArticle.mutate(data, { onSuccess: () => setEditorOpen(false) });
    } else {
      createArticle.mutate(data, { onSuccess: () => setEditorOpen(false) });
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Base de Conhecimento</h1>
          <p className="text-muted-foreground text-sm">Gerir artigos, categorias e conteúdos de ajuda</p>
        </div>
      </div>

      <Tabs defaultValue="articles">
        <TabsList>
          <TabsTrigger value="articles" className="gap-1"><BookOpen className="h-4 w-4" />Artigos ({articles.length})</TabsTrigger>
          <TabsTrigger value="categories" className="gap-1"><FolderOpen className="h-4 w-4" />Categorias ({categories.length})</TabsTrigger>
        </TabsList>

        {/* ── Articles Tab ──────────────────────────────────── */}
        <TabsContent value="articles" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar artigos..." className="pl-9" />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                {categories.map((c) => <SelectItem key={c.slug} value={c.slug}>{c.title}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos tipos</SelectItem>
                {Object.entries(TYPE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={openNewArticle} className="gap-1"><Plus className="h-4 w-4" />Novo Artigo</Button>
          </div>

          <Card>
            <CardContent className="p-0">
              {isLoadingArticles ? (
                <div className="p-4 space-y-3">{[1,2,3].map((i) => <Skeleton key={i} height={40} />)}</div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">Nenhum artigo encontrado</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Views</TableHead>
                      <TableHead>Atualizado</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium max-w-[250px] truncate">{a.title}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {categories.find((c) => c.slug === a.category_slug)?.title || a.category_slug}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{TYPE_LABELS[a.article_type] || a.article_type}</TableCell>
                        <TableCell>
                          <Badge variant={a.is_published ? "default" : "secondary"} className="text-xs">
                            {a.is_published ? "Publicado" : "Rascunho"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">{a.view_count}</TableCell>
                        <TableCell className="text-xs text-muted-foreground"><TimeAgo date={a.updated_at} /></TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => togglePublish.mutate({ id: a.id, is_published: !a.is_published })}>
                              {a.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditArticle(a)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Eliminar artigo?</AlertDialogTitle>
                                  <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteArticle.mutate(a.id)}>Eliminar</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Categories Tab ──────────────────────────────── */}
        <TabsContent value="categories" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openNewCategory} className="gap-1"><Plus className="h-4 w-4" />Nova Categoria</Button>
          </div>

          {isLoadingCategories ? (
            <div className="space-y-3">{[1,2,3].map((i) => <Skeleton key={i} height={60} />)}</div>
          ) : categories.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">Nenhuma categoria criada</CardContent></Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((c) => (
                <Card key={c.id} className="group">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-md flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: c.color }}>
                          {c.icon?.slice(0, 2) || "KB"}
                        </div>
                        <CardTitle className="text-sm">{c.title}</CardTitle>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditCategory(c)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" disabled={(c.article_count ?? 0) > 0}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Eliminar categoria?</AlertDialogTitle>
                              <AlertDialogDescription>Só é possível eliminar categorias sem artigos.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteCategory.mutate(c.id)}>Eliminar</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-muted-foreground">{c.description || "Sem descrição"}</p>
                    <Badge variant="outline" className="mt-2 text-xs">{c.article_count ?? 0} artigos</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Article Editor */}
      <KBArticleEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        article={editingArticle}
        categories={categories}
        onSave={handleSaveArticle}
        isSaving={createArticle.isPending || updateArticle.isPending}
      />

      {/* Category Dialog */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCat ? "Editar Categoria" : "Nova Categoria"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Título</Label>
              <Input value={catTitle} onChange={(e) => { setCatTitle(e.target.value); if (!editingCat) setCatSlug(e.target.value.toLowerCase().replace(/\s+/g, "-")); }} />
            </div>
            <div>
              <Label>Slug</Label>
              <Input value={catSlug} onChange={(e) => setCatSlug(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Ícone</Label>
                <Input value={catIcon} onChange={(e) => setCatIcon(e.target.value)} placeholder="BookOpen" />
              </div>
              <div>
                <Label>Cor</Label>
                <Input type="color" value={catColor} onChange={(e) => setCatColor(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Descrição</Label>
              <Input value={catDesc} onChange={(e) => setCatDesc(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatDialogOpen(false)}>Cancelar</Button>
            <Button onClick={saveCategory} disabled={!catTitle.trim()}>
              {editingCat ? "Guardar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
