import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Plus, Pencil, Trash2, Search, Zap, Loader2, Hash, MessageSquare, Eye } from "lucide-react";
import {
  useInboxSnippets,
  useCreateInboxSnippet,
  useUpdateInboxSnippet,
  useDeleteInboxSnippet,
  type InboxSnippetRow,
} from "@/hooks/useInboxSnippets";
import { AVAILABLE_VARIABLES, expandSnippetVariables } from "@/lib/snippetVariables";
import { toast } from "sonner";

interface FormState {
  id?: string;
  shortcut: string;
  title: string;
  content: string;
  description: string;
  is_personal: boolean;
}

const EMPTY: FormState = {
  shortcut: "",
  title: "",
  content: "",
  description: "",
  is_personal: false,
};

export default function WhatsAppQuickRepliesPage() {
  const { data: snippets = [], isLoading } = useInboxSnippets();
  const createMut = useCreateInboxSnippet();
  const updateMut = useUpdateInboxSnippet();
  const deleteMut = useDeleteInboxSnippet();

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSnippet, setPreviewSnippet] = useState<InboxSnippetRow | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return snippets;
    return snippets.filter(
      (s) =>
        s.shortcut.toLowerCase().includes(q) ||
        s.title.toLowerCase().includes(q) ||
        s.content.toLowerCase().includes(q),
    );
  }, [snippets, search]);

  const openCreate = () => {
    setForm(EMPTY);
    setDialogOpen(true);
  };

  const openEdit = (s: InboxSnippetRow) => {
    setForm({
      id: s.id,
      shortcut: s.shortcut,
      title: s.title,
      content: s.content,
      description: s.description ?? "",
      is_personal: s.is_personal,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    const shortcut = form.shortcut.trim().replace(/^\/+/, "");
    if (!shortcut || !form.title.trim() || !form.content.trim()) {
      toast.error("Atalho, título e conteúdo são obrigatórios.");
      return;
    }
    const payload = {
      shortcut,
      title: form.title.trim(),
      content: form.content,
      description: form.description.trim() || null,
      is_personal: form.is_personal,
    };
    try {
      if (form.id) {
        await updateMut.mutateAsync({ id: form.id, ...payload });
      } else {
        await createMut.mutateAsync(payload);
      }
      setDialogOpen(false);
    } catch {
      /* toast feito nos hooks */
    }
  };

  const insertVariable = (key: string) => {
    setForm((f) => ({ ...f, content: `${f.content}{{${key}}}` }));
  };

  const openPreview = (s: InboxSnippetRow) => {
    setPreviewSnippet(s);
    setPreviewOpen(true);
  };

  const previewExpanded = useMemo(() => {
    if (!previewSnippet) return null;
    return expandSnippetVariables(previewSnippet.content, {
      contactName: "João Silva",
      contactEmail: "joao@empresa.pt",
      contactPhone: "+351 912 345 678",
      contactCompany: "Empresa Lda",
      agentName: "Operador",
    });
  }, [previewSnippet]);

  const personalCount = snippets.filter((s) => s.is_personal).length;
  const sharedCount = snippets.length - personalCount;

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6 max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Zap className="h-7 w-7 text-primary" /> Quick Replies WhatsApp
            </h1>
            <p className="text-muted-foreground mt-1">
              Respostas rápidas com atalhos. Na conversa, escreva <code className="px-1.5 py-0.5 rounded bg-muted text-xs">/atalho</code> para inserir.
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" /> Nova Quick Reply
          </Button>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{snippets.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Partilhadas</p>
              <p className="text-2xl font-bold">{sharedCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Pessoais</p>
              <p className="text-2xl font-bold">{personalCount}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5" /> Biblioteca
              </CardTitle>
              <div className="relative w-72 max-w-full">
                <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input
                  placeholder="Procurar por atalho, título ou conteúdo..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Zap className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>Nenhuma quick reply encontrada.</p>
                <Button variant="outline" className="mt-4" onClick={openCreate}>
                  <Plus className="h-4 w-4 mr-2" /> Criar a primeira
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filtered.map((s) => (
                  <div
                    key={s.id}
                    className="border rounded-lg p-3 hover:border-primary/50 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge variant="secondary" className="font-mono text-xs">
                            <Hash className="h-3 w-3 mr-0.5" />
                            {s.shortcut}
                          </Badge>
                          {s.is_personal ? (
                            <Badge variant="outline" className="text-xs">Pessoal</Badge>
                          ) : (
                            <Badge variant="default" className="text-xs">Equipa</Badge>
                          )}
                          {s.usage_count > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {s.usage_count} usos
                            </Badge>
                          )}
                        </div>
                        <p className="font-medium text-sm truncate">{s.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1 whitespace-pre-wrap">
                          {s.content}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openPreview(s)} title="Pré-visualizar">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(s)} title="Editar">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(s.id)} title="Eliminar">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create / Edit dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{form.id ? "Editar Quick Reply" : "Nova Quick Reply"}</DialogTitle>
              <DialogDescription>
                Defina um atalho curto e o conteúdo a inserir. Use variáveis como{" "}
                <code>{"{{nome}}"}</code> para personalizar.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="shortcut">Atalho *</Label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2.5 text-muted-foreground text-sm">/</span>
                    <Input
                      id="shortcut"
                      value={form.shortcut}
                      onChange={(e) => setForm((f) => ({ ...f, shortcut: e.target.value.replace(/\s+/g, "-").toLowerCase() }))}
                      placeholder="ola"
                      className="pl-6 font-mono"
                      maxLength={32}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="title">Título *</Label>
                  <Input
                    id="title"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="Saudação inicial"
                    maxLength={120}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="content">Conteúdo *</Label>
                <Textarea
                  id="content"
                  value={form.content}
                  onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                  placeholder="Olá {{primeiro_nome}}, como posso ajudar?"
                  rows={6}
                  maxLength={4000}
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-xs text-muted-foreground self-center mr-1">Inserir:</span>
                  {AVAILABLE_VARIABLES.map((v) => (
                    <Button
                      key={v.key}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => insertVariable(v.key)}
                      title={v.label}
                    >
                      {`{{${v.key}}}`}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Input
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Breve nota interna"
                  maxLength={200}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label htmlFor="is_personal" className="cursor-pointer">Pessoal</Label>
                  <p className="text-xs text-muted-foreground">
                    Se ativo, apenas você vê este atalho. Caso contrário, fica disponível à equipa.
                  </p>
                </div>
                <Switch
                  id="is_personal"
                  checked={form.is_personal}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, is_personal: v }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={createMut.isPending || updateMut.isPending}>
                {(createMut.isPending || updateMut.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {form.id ? "Guardar alterações" : "Criar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Preview dialog */}
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Pré-visualização</DialogTitle>
              <DialogDescription>
                Como o destinatário vai ver a mensagem (com dados de exemplo).
              </DialogDescription>
            </DialogHeader>
            {previewExpanded && (
              <div className="space-y-3">
                <div className="rounded-lg bg-[hsl(var(--muted))] p-4">
                  <p className="whitespace-pre-wrap text-sm">{previewExpanded.text}</p>
                </div>
                {previewExpanded.unresolved.length > 0 && (
                  <p className="text-xs text-amber-600">
                    Variáveis sem valor de exemplo: {previewExpanded.unresolved.join(", ")}
                  </p>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete confirm */}
        <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar quick reply?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acção não pode ser revertida.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  if (deleteId) {
                    await deleteMut.mutateAsync(deleteId);
                    setDeleteId(null);
                  }
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
