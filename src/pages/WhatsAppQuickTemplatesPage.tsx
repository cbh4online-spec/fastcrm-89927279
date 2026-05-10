import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Zap, Plus, Sparkles, Eye, Copy, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";
import {
  useWhatsAppTemplates,
  useUpsertWhatsAppTemplate,
  useDeleteWhatsAppTemplate,
} from "@/hooks/useWhatsAppTemplates";
import {
  QUICK_TEMPLATE_SEEDS,
  QUICK_VARIABLES,
  QUICK_VARIABLE_CATEGORIES,
  detectQuickVariables,
  renderQuickTemplate,
  resolveQuickVariables,
} from "@/lib/whatsappQuickVariables";

const CATEGORY_LABELS: Record<string, string> = {
  boas_vindas: "Boas-vindas",
  vendas: "Vendas",
  recuperacao: "Recuperação",
  operacional: "Operacional",
  pos_venda: "Pós-venda",
  general: "Geral",
};

export default function WhatsAppQuickTemplatesPage() {
  const { data: templates, isLoading } = useWhatsAppTemplates();
  const upsert = useUpsertWhatsAppTemplate();
  const del = useDeleteWhatsAppTemplate();

  const [search, setSearch] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editor, setEditor] = useState<{ id?: string; name: string; body: string; category: string }>({
    name: "",
    body: "",
    category: "vendas",
  });

  const quickTemplates = useMemo(
    () =>
      (templates || []).filter((t) => (t.tags || []).includes("quick")),
    [templates],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return quickTemplates;
    return quickTemplates.filter(
      (t) => t.name.toLowerCase().includes(q) || t.body.toLowerCase().includes(q),
    );
  }, [quickTemplates, search]);

  const previewVars = useMemo(() => resolveQuickVariables({}), []);

  function openCreate() {
    setEditor({ name: "", body: "", category: "vendas" });
    setEditorOpen(true);
  }

  function openEdit(t: { id: string; name: string; body: string; category?: string | null }) {
    setEditor({ id: t.id, name: t.name, body: t.body, category: t.category || "vendas" });
    setEditorOpen(true);
  }

  async function save() {
    if (!editor.name.trim() || !editor.body.trim()) {
      toast.error("Nome e corpo obrigatórios");
      return;
    }
    await upsert.mutateAsync({
      id: editor.id,
      name: editor.name.trim(),
      body: editor.body,
      category: editor.category,
      country: "PT",
      language: "pt",
      status: "approved",
      is_active: true,
      tags: ["quick"],
    });
    setEditorOpen(false);
  }

  async function seedFrom(seed: typeof QUICK_TEMPLATE_SEEDS[number]) {
    await upsert.mutateAsync({
      name: seed.name,
      body: seed.body,
      category: seed.category,
      country: "PT",
      language: "pt",
      status: "approved",
      is_active: true,
      tags: seed.tags || ["quick"],
    });
  }

  function copyVar(key: string) {
    void navigator.clipboard.writeText(`{{${key}}}`);
    toast.success(`Copiado: {{${key}}}`);
  }

  function insertVarInEditor(key: string) {
    setEditor((e) => ({ ...e, body: e.body + `{{${key}}}` }));
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Zap className="h-7 w-7 text-primary" />
            <div>
              <h1 className="text-2xl font-semibold">Templates Rápidos</h1>
              <p className="text-sm text-muted-foreground">
                Mensagens pré-feitas com variáveis dinâmicas — atalho no Inbox e Campanhas.
              </p>
            </div>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" /> Novo template
          </Button>
        </div>

        <Tabs defaultValue="library">
          <TabsList>
            <TabsTrigger value="library">
              Os meus templates ({quickTemplates.length})
            </TabsTrigger>
            <TabsTrigger value="seeds">Biblioteca de exemplos</TabsTrigger>
            <TabsTrigger value="vars">Variáveis disponíveis</TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="space-y-4">
            <Input
              placeholder="Pesquisar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-44 rounded-lg" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-sm text-muted-foreground">
                  Sem templates rápidos ainda. Cria o primeiro ou importa da biblioteca.
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filtered.map((t) => {
                  const vars = detectQuickVariables(t.body);
                  return (
                    <Card key={t.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between gap-2">
                          <CardTitle className="text-sm truncate">{t.name}</CardTitle>
                          <Badge variant="secondary" className="text-xs shrink-0">
                            {CATEGORY_LABELS[t.category || "general"] || t.category}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="text-xs text-muted-foreground line-clamp-4 whitespace-pre-line min-h-[64px]">
                          {t.body}
                        </div>
                        {vars.length > 0 && (
                          <div className="flex gap-1 flex-wrap">
                            {vars.slice(0, 5).map((v) => (
                              <span
                                key={v}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono"
                              >
                                {`{{${v}}}`}
                              </span>
                            ))}
                            {vars.length > 5 && (
                              <span className="text-[10px] text-muted-foreground">
                                +{vars.length - 5}
                              </span>
                            )}
                          </div>
                        )}
                        <div className="flex gap-2 pt-1">
                          <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(t)}>
                            <FileText className="h-3.5 w-3.5 mr-1" /> Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              void navigator.clipboard.writeText(t.body);
                              toast.success("Corpo copiado");
                            }}
                            title="Copiar"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (confirm(`Eliminar "${t.name}"?`)) del.mutate(t.id);
                            }}
                            title="Eliminar"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="seeds" className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Templates prontos a usar — clica para adicionar à tua biblioteca.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {QUICK_TEMPLATE_SEEDS.map((seed) => (
                <Card key={seed.name}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-sm">{seed.name}</CardTitle>
                      <Badge variant="outline" className="text-xs">
                        {CATEGORY_LABELS[seed.category] || seed.category}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-xs whitespace-pre-line bg-muted/40 rounded p-2 border">
                      {seed.body}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => seedFrom(seed)}
                      disabled={upsert.isPending}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar à biblioteca
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="vars" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Variáveis disponíveis em qualquer template. Clica para copiar.
            </p>
            {Object.entries(QUICK_VARIABLE_CATEGORIES).map(([cat, list]) => (
              <Card key={cat}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm capitalize">{cat}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {list.map((v) => (
                      <button
                        key={v.key}
                        type="button"
                        onClick={() => copyVar(v.key)}
                        className="text-left p-2 rounded border hover:bg-accent transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <code className="text-xs font-mono text-primary">{`{{${v.key}}}`}</code>
                          <Copy className="h-3 w-3 text-muted-foreground" />
                        </div>
                        <div className="text-xs font-medium mt-0.5">{v.label}</div>
                        <div className="text-[10px] text-muted-foreground">ex: {v.example}</div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editor.id ? "Editar template" : "Novo template rápido"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nome</Label>
                <Input
                  value={editor.name}
                  onChange={(e) => setEditor((s) => ({ ...s, name: e.target.value }))}
                  placeholder="Ex: Promo Black Friday"
                  maxLength={120}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <select
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={editor.category}
                  onChange={(e) => setEditor((s) => ({ ...s, category: e.target.value }))}
                >
                  {Object.entries(CATEGORY_LABELS).map(([k, l]) => (
                    <option key={k} value={k}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Corpo da mensagem</Label>
              <Textarea
                rows={6}
                value={editor.body}
                onChange={(e) => setEditor((s) => ({ ...s, body: e.target.value }))}
                placeholder="Olá {{primeiro_nome}}! O teu {{produto}} por {{preco}}: {{link}}"
                maxLength={2000}
              />
              <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Inserir:
                {QUICK_VARIABLES.slice(0, 8).map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => insertVarInEditor(v.key)}
                    className="font-mono text-primary hover:underline"
                  >
                    {`{{${v.key}}}`}
                  </button>
                ))}
              </div>
            </div>

            {editor.body && (
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5" /> Pré-visualização (com dados de exemplo)
                </Label>
                <div className="rounded-md bg-muted/40 p-3 text-sm whitespace-pre-line border min-h-[80px]">
                  {renderQuickTemplate(editor.body, {
                    overrides: {
                      ...previewVars,
                      nome: "Maria Silva",
                      primeiro_nome: "Maria",
                      produto: "Auriculares Pro",
                      preco: "129,00 €",
                      preco_promo: "99,00 €",
                      link: "https://loja.exemplo.com/p/auriculares",
                      cupao: "WELCOME10",
                      loja: "Loja Exemplo",
                      agente: "Ana",
                    },
                  })}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditorOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={upsert.isPending}>
              {upsert.isPending ? "A guardar..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
