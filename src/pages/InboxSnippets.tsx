import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Zap,
  Loader2,
  Hash,
  Users,
  User,
} from "lucide-react";
import {
  useInboxSnippets,
  useCreateInboxSnippet,
  useUpdateInboxSnippet,
  useDeleteInboxSnippet,
  type InboxSnippetRow,
  type SnippetInput,
} from "@/hooks/useInboxSnippets";
import {
  AVAILABLE_VARIABLES,
  expandSnippetVariables,
} from "@/lib/snippetVariables";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const EMPTY: SnippetInput = {
  shortcut: "",
  title: "",
  content: "",
  description: "",
  is_personal: false,
};

function previewWithSampleData(content: string): string {
  return expandSnippetVariables(content, {
    contactName: "João Silva",
    contactEmail: "joao@empresa.pt",
    contactPhone: "+351 912 345 678",
    contactCompany: "Empresa Lda",
    agentName: "Maria",
  }).text;
}

export default function InboxSnippets() {
  const { user } = useAuth();
  const { data: snippets = [], isLoading } = useInboxSnippets();
  const createMutation = useCreateInboxSnippet();
  const updateMutation = useUpdateInboxSnippet();
  const deleteMutation = useDeleteInboxSnippet();

  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<InboxSnippetRow | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<InboxSnippetRow | null>(null);
  const [form, setForm] = useState<SnippetInput>(EMPTY);

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
    setEditing(null);
    setForm(EMPTY);
    setShowDialog(true);
  };

  const openEdit = (s: InboxSnippetRow) => {
    setEditing(s);
    setForm({
      shortcut: s.shortcut,
      title: s.title,
      content: s.content,
      description: s.description ?? "",
      is_personal: s.is_personal,
    });
    setShowDialog(true);
  };

  const insertVariable = (key: string) => {
    setForm((f) => ({ ...f, content: f.content + `{{${key}}}` }));
  };

  const handleSubmit = async () => {
    if (!form.shortcut.trim() || !form.title.trim() || !form.content.trim()) {
      return;
    }
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, ...form });
    } else {
      await createMutation.mutateAsync(form);
    }
    setShowDialog(false);
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const formInvalid =
    !form.shortcut.trim() || !form.title.trim() || !form.content.trim();

  return (
    <DashboardLayout>
      <div className="container max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Snippets do Inbox</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Respostas rápidas com atalhos (ex: <code className="bg-muted px-1 rounded">/saudacao</code>) e variáveis dinâmicas como <code className="bg-muted px-1 rounded">{`{{nome}}`}</code>.
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Novo snippet
          </Button>
        </div>

        {/* Variáveis disponíveis */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Hash className="w-4 h-4" /> Variáveis disponíveis
            </CardTitle>
            <CardDescription className="text-xs">
              Use estas variáveis nos seus snippets — serão substituídas automaticamente quando inserir.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_VARIABLES.map((v) => (
                <Badge
                  key={v.key}
                  variant="secondary"
                  className="font-mono text-[11px]"
                  title={`${v.label} → ex: ${v.example}`}
                >
                  {`{{${v.key}}}`}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar snippets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Lista */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Zap className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">
                {search
                  ? "Nenhum snippet corresponde à pesquisa."
                  : "Ainda não tem snippets. Crie o primeiro para acelerar o atendimento."}
              </p>
              {!search && (
                <Button onClick={openCreate} className="mt-4" variant="outline">
                  <Plus className="w-4 h-4 mr-2" /> Criar primeiro snippet
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {filtered.map((s) => {
              const canEdit = s.user_id === user?.id || !s.is_personal;
              return (
                <Card key={s.id} className="group">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="font-mono text-[10px]">
                            /{s.shortcut}
                          </Badge>
                          <Badge
                            variant={s.is_personal ? "secondary" : "default"}
                            className="text-[10px] gap-1"
                          >
                            {s.is_personal ? (
                              <>
                                <User className="w-3 h-3" /> Pessoal
                              </>
                            ) : (
                              <>
                                <Users className="w-3 h-3" /> Equipa
                              </>
                            )}
                          </Badge>
                          {s.usage_count > 0 && (
                            <span className="text-[10px] text-muted-foreground">
                              · usado {s.usage_count}×
                            </span>
                          )}
                        </div>
                        <CardTitle className="text-sm mt-2">{s.title}</CardTitle>
                        {s.description && (
                          <CardDescription className="text-xs mt-1 line-clamp-2">
                            {s.description}
                          </CardDescription>
                        )}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => openEdit(s)}
                          disabled={!canEdit}
                          title={canEdit ? "Editar" : "Sem permissão"}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(s)}
                          disabled={!canEdit}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div
                      className={cn(
                        "text-xs whitespace-pre-wrap rounded-md p-2 bg-muted/40 border max-h-24 overflow-y-auto",
                        "font-mono",
                      )}
                    >
                      {s.content}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Dialog Criar / Editar */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar snippet" : "Novo snippet"}
            </DialogTitle>
            <DialogDescription>
              Defina um atalho curto. Use variáveis como <code>{`{{nome}}`}</code> para personalizar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1.5 md:col-span-1">
                <Label htmlFor="snippet-shortcut">Atalho *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">/</span>
                  <Input
                    id="snippet-shortcut"
                    value={form.shortcut}
                    onChange={(e) =>
                      setForm({ ...form, shortcut: e.target.value.replace(/\s+/g, "_").toLowerCase() })
                    }
                    placeholder="saudacao"
                    className="pl-6 font-mono"
                    maxLength={40}
                  />
                </div>
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="snippet-title">Título *</Label>
                <Input
                  id="snippet-title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Saudação inicial"
                  maxLength={100}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="snippet-description">Descrição (opcional)</Label>
              <Input
                id="snippet-description"
                value={form.description ?? ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Quando usar este snippet..."
                maxLength={200}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="snippet-content">Conteúdo *</Label>
                <div className="flex flex-wrap gap-1">
                  {AVAILABLE_VARIABLES.slice(0, 6).map((v) => (
                    <Button
                      key={v.key}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 text-[10px] font-mono px-1.5"
                      onClick={() => insertVariable(v.key)}
                    >
                      +{`{{${v.key}}}`}
                    </Button>
                  ))}
                </div>
              </div>
              <Textarea
                id="snippet-content"
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="Olá {{primeiro_nome}}, sou {{agente}} da nossa equipa..."
                rows={5}
                className="font-mono text-sm"
              />
            </div>

            {form.content.trim() && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Pré-visualização (com dados de exemplo)</Label>
                <div className="text-sm whitespace-pre-wrap rounded-md p-3 bg-muted/40 border">
                  {previewWithSampleData(form.content)}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <div className="space-y-0.5">
                <Label htmlFor="snippet-personal" className="text-sm">
                  Snippet pessoal
                </Label>
                <p className="text-xs text-muted-foreground">
                  {form.is_personal
                    ? "Apenas visível para si."
                    : "Partilhado com todos os membros do workspace."}
                </p>
              </div>
              <Switch
                id="snippet-personal"
                checked={form.is_personal ?? false}
                onCheckedChange={(v) => setForm({ ...form, is_personal: v })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={formInvalid || isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editing ? "Guardar alterações" : "Criar snippet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar eliminação */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar snippet?</AlertDialogTitle>
            <AlertDialogDescription>
              O snippet <strong>/{deleteTarget?.shortcut}</strong> será removido permanentemente. Esta acção não pode ser revertida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deleteTarget) {
                  await deleteMutation.mutateAsync(deleteTarget.id);
                  setDeleteTarget(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
