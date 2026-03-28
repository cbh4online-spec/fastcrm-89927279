import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Zap, Plus, Pencil, Trash2, Search } from "lucide-react";
import { useHelpdeskCannedResponses, type CannedResponse } from "@/hooks/useHelpdeskCannedResponses";
import { toast } from "sonner";
import { Toolbar } from "@/components/common/Toolbar";

export default function HelpdeskCannedResponses() {
  const { responses, isLoading, createResponse, updateResponse, deleteResponse } = useHelpdeskCannedResponses();
  const [search, setSearch] = useState("");
  const [editItem, setEditItem] = useState<CannedResponse | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [shortcut, setShortcut] = useState("");

  const filtered = responses.filter(
    (r) =>
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.content.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditItem(null);
    setTitle("");
    setContent("");
    setCategory("");
    setShortcut("");
    setFormOpen(true);
  };

  const openEdit = (r: CannedResponse) => {
    setEditItem(r);
    setTitle(r.title);
    setContent(r.content);
    setCategory(r.category || "");
    setShortcut(r.shortcut || "");
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error("Título e conteúdo são obrigatórios");
      return;
    }
    try {
      if (editItem) {
        await updateResponse.mutateAsync({ id: editItem.id, title, content, category: category || undefined, shortcut: shortcut || undefined });
        toast.success("Resposta atualizada");
      } else {
        await createResponse.mutateAsync({ title, content, category: category || undefined, shortcut: shortcut || undefined });
        toast.success("Resposta criada");
      }
      setFormOpen(false);
    } catch {
      toast.error("Erro ao guardar");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteResponse.mutateAsync(id);
      toast.success("Resposta eliminada");
    } catch {
      toast.error("Erro ao eliminar");
    }
  };

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Respostas Rápidas
        </h1>
        <Button size="sm" className="gap-1.5" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Nova Resposta
        </Button>
      </div>

      <Toolbar
        searchValue={search}
        searchPlaceholder="Pesquisar respostas..."
        onSearchChange={setSearch}
        showFilters={false}
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground text-center py-8">A carregar...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Sem respostas rápidas</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => (
            <Card key={r.id} className="group">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-sm">{r.title}</CardTitle>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(r)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDelete(r.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground line-clamp-3">{r.content}</p>
                <div className="flex gap-1.5 mt-2">
                  {r.category && <Badge variant="secondary" className="text-[10px]">{r.category}</Badge>}
                  {r.shortcut && <Badge variant="outline" className="text-[10px] font-mono">{r.shortcut}</Badge>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editItem ? "Editar Resposta" : "Nova Resposta Rápida"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Título *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nome da resposta" />
            </div>
            <div>
              <Label className="text-xs">Conteúdo *</Label>
              <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Texto da resposta..." className="min-h-[120px]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Categoria</Label>
                <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ex: Saudação" />
              </div>
              <div>
                <Label className="text-xs">Atalho</Label>
                <Input value={shortcut} onChange={(e) => setShortcut(e.target.value)} placeholder="Ex: /saudacao" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editItem ? "Guardar" : "Criar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
