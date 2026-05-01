import { useState } from "react";
import { ClientLayout } from "@/components/client-portal/ClientLayout";
import { EditorialPageHeader } from "@/components/client-portal/EditorialPageHeader";
import { useClientAuth } from "@/hooks/client-portal/useClientAuth";
import {
  usePartnerCatalogPages,
  useCreatePartnerCatalogPage,
  useUpdatePartnerCatalogPage,
  useDeletePartnerCatalogPage,
  useAddPageItem,
  useRemovePageItem,
} from "@/hooks/usePartnerCatalogPages";
import { useClientProducts } from "@/hooks/client-portal/useClientProducts";
import { LOOKBOOK_TEMPLATES } from "@/components/client-portal/lookbook/templates";
import { LOOKBOOK_THEMES } from "@/components/client-portal/lookbook/themes";
import { LookbookRenderer } from "@/components/client-portal/lookbook/LookbookRenderer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Edit, X, Loader2 } from "lucide-react";
import type { PartnerCatalogPageWithItems, LookbookTemplateKey, LookbookThemeKey } from "@/types/partnerCatalog";

export default function ClientCatalogPagesAdminPage() {
  const { clientUser } = useClientAuth();
  const workspaceId = clientUser?.workspace_id;

  const { data: pages = [], isLoading } = usePartnerCatalogPages(workspaceId, { activeOnly: false });
  const createPage = useCreatePartnerCatalogPage(workspaceId);
  const updatePage = useUpdatePartnerCatalogPage(workspaceId);
  const deletePage = useDeletePartnerCatalogPage(workspaceId);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = pages.find((p) => p.id === selectedId) || null;

  return (
    <ClientLayout>
      <div className="space-y-8">
        <EditorialPageHeader
          breadcrumbs={[
            { label: "Portal", to: "/client" },
            { label: "Admin", to: "/client" },
            { label: "Lookbook" },
          ]}
          eyebrow="Admin · Catálogo Editorial"
          title="Páginas do Lookbook"
          subtitle="Crie, organize e publique páginas tipo revista para os clientes B2B."
          actions={
            <Button
              onClick={() =>
                createPage.mutate(
                  { title: "Nova página", display_order: pages.length },
                  { onSuccess: (p) => setSelectedId(p.id) }
                )
              }
              className="rounded-full bg-[hsl(var(--editorial-ink))] text-[hsl(var(--editorial-cream))]"
            >
              <Plus className="h-4 w-4 mr-2" /> Nova página
            </Button>
          }
        />

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Lista de páginas */}
            <Card className="lg:col-span-4 border-[hsl(var(--editorial-border))]/50">
              <CardHeader>
                <CardTitle className="font-editorial text-xl">Páginas ({pages.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {pages.length === 0 && (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Sem páginas. Crie a primeira.
                  </p>
                )}
                {pages.map((p, idx) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedId(p.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedId === p.id
                        ? "border-[hsl(var(--editorial-ink))] bg-[hsl(var(--editorial-champagne))]/30"
                        : "border-border hover:border-[hsl(var(--editorial-ink))]/50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono text-muted-foreground">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <span className="flex-1 font-medium truncate">{p.title}</span>
                      {!p.is_active && <Badge variant="outline" className="text-[10px]">Rascunho</Badge>}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground uppercase tracking-wide">
                      <span>{LOOKBOOK_TEMPLATES[p.template_key]?.name ?? p.template_key}</span>
                      <span>·</span>
                      <span>{LOOKBOOK_THEMES[p.theme_key]?.name ?? p.theme_key}</span>
                      <span>·</span>
                      <span>{p.items.length} produtos</span>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Editor + Preview */}
            <div className="lg:col-span-8 space-y-6">
              {selected ? (
                <PageEditor
                  page={selected}
                  workspaceId={workspaceId}
                  onUpdate={(patch) => updatePage.mutate({ id: selected.id, ...patch })}
                  onDelete={() => {
                    if (confirm("Arquivar esta página?")) {
                      deletePage.mutate(selected.id);
                      setSelectedId(null);
                    }
                  }}
                />
              ) : (
                <Card className="border-dashed border-[hsl(var(--editorial-border))]/50">
                  <CardContent className="py-16 text-center">
                    <Edit className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                    <p className="text-muted-foreground">Selecione uma página para editar</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </ClientLayout>
  );
}

// ============= Page Editor =============
interface PageEditorProps {
  page: PartnerCatalogPageWithItems;
  workspaceId: string | undefined;
  onUpdate: (patch: any) => void;
  onDelete: () => void;
}

function PageEditor({ page, workspaceId, onUpdate, onDelete }: PageEditorProps) {
  const [showProducts, setShowProducts] = useState(false);
  const addItem = useAddPageItem(workspaceId);
  const removeItem = useRemovePageItem(workspaceId);
  const { products } = useClientProducts(workspaceId, undefined);

  const template = LOOKBOOK_TEMPLATES[page.template_key];

  return (
    <>
      {/* Form */}
      <Card className="border-[hsl(var(--editorial-border))]/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-editorial text-xl">Configuração</CardTitle>
          <Button variant="ghost" size="sm" onClick={onDelete} className="text-destructive">
            <Trash2 className="h-4 w-4 mr-2" /> Arquivar
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Título</Label>
            <Input
              defaultValue={page.title}
              onBlur={(e) => e.target.value !== page.title && onUpdate({ title: e.target.value })}
            />
          </div>
          <div>
            <Label>Eyebrow (sobrescrito)</Label>
            <Input
              defaultValue={page.eyebrow ?? ""}
              onBlur={(e) => onUpdate({ eyebrow: e.target.value || null })}
              placeholder="Ex.: Coleção Outono"
            />
          </div>
          <div>
            <Label>Imagem hero (URL, opcional)</Label>
            <Input
              defaultValue={page.hero_image_url ?? ""}
              onBlur={(e) => onUpdate({ hero_image_url: e.target.value || null })}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Descrição</Label>
            <Textarea
              rows={2}
              defaultValue={page.description ?? ""}
              onBlur={(e) => onUpdate({ description: e.target.value || null })}
            />
          </div>
          <div>
            <Label>Template</Label>
            <Select
              value={page.template_key}
              onValueChange={(v: LookbookTemplateKey) => onUpdate({ template_key: v })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.values(LOOKBOOK_TEMPLATES).map((t) => (
                  <SelectItem key={t.key} value={t.key}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">{template?.description}</p>
          </div>
          <div>
            <Label>Tema</Label>
            <Select
              value={page.theme_key}
              onValueChange={(v: LookbookThemeKey) => onUpdate({ theme_key: v })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.values(LOOKBOOK_THEMES).map((t) => (
                  <SelectItem key={t.key} value={t.key}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3 sm:col-span-2 pt-2">
            <Switch
              checked={page.is_active}
              onCheckedChange={(v) => onUpdate({ is_active: v })}
            />
            <Label>Página publicada (visível para clientes)</Label>
          </div>
        </CardContent>
      </Card>

      {/* Produtos atribuídos */}
      <Card className="border-[hsl(var(--editorial-border))]/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-editorial text-xl">Produtos ({page.items.length})</CardTitle>
          <Button size="sm" onClick={() => setShowProducts((s) => !s)} className="rounded-full">
            <Plus className="h-4 w-4 mr-2" /> {showProducts ? "Fechar" : "Adicionar"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {page.items.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum produto. Adicione pelo menos {template?.slots.length || 1} para preencher o template.
            </p>
          )}
          {page.items.map((it) => (
            <div key={it.id} className="flex items-center gap-3 p-2 border rounded-lg">
              {it.product?.images?.[0] && (
                <img src={it.product.images[0]} alt="" className="w-12 h-12 object-cover rounded" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{it.product?.name}</p>
                <p className="text-xs text-muted-foreground">SKU: {it.product?.sku || "—"} · Slot: {it.slot}</p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => removeItem.mutate(it.id)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}

          {showProducts && (
            <div className="border-t pt-3 max-h-[300px] overflow-y-auto space-y-1">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                Selecionar produto
              </p>
              {products.slice(0, 50).map((p) => (
                <button
                  key={p.id}
                  onClick={() => addItem.mutate({ page_id: page.id, product_id: p.id, display_order: page.items.length })}
                  className="w-full text-left flex items-center gap-2 p-2 rounded hover:bg-muted text-sm"
                >
                  {p.images?.[0] && (
                    <img src={p.images[0]} alt="" className="w-8 h-8 object-cover rounded" />
                  )}
                  <span className="flex-1 truncate">{p.name}</span>
                  <span className="text-xs text-muted-foreground">{p.sku}</span>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview */}
      <Card className="border-[hsl(var(--editorial-border))]/50">
        <CardHeader>
          <CardTitle className="font-editorial text-xl">Pré-visualização</CardTitle>
        </CardHeader>
        <CardContent>
          <LookbookRenderer pages={[page]} onAddToCart={() => {}} />
        </CardContent>
      </Card>
    </>
  );
}
