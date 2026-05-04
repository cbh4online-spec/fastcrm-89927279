import { useState } from "react";
import {
  useAllPartnerSlides,
  useUpsertPartnerSlide,
  useDeletePartnerSlide,
  PARTNER_SLIDE_KIND_LABEL,
  type PartnerPortalSlide,
  type PartnerSlideKind,
} from "@/hooks/usePartnerPortalSlides";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2, Image as ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Props {
  workspaceId?: string | null;
}

const empty = (workspaceId: string): Partial<PartnerPortalSlide> => ({
  workspace_id: workspaceId,
  kind: "campaign",
  eyebrow: "",
  title: "",
  subtitle: "",
  description: "",
  image_url: "",
  cta_label: "",
  cta_url: "",
  display_order: 0,
  is_active: true,
  theme: "light",
});

export function B2BPortalBannersManager({ workspaceId }: Props) {
  const { data: slides = [], isLoading } = useAllPartnerSlides(workspaceId);
  const upsert = useUpsertPartnerSlide(workspaceId);
  const remove = useDeletePartnerSlide();

  const [editing, setEditing] = useState<Partial<PartnerPortalSlide> | null>(null);

  const openNew = () => workspaceId && setEditing(empty(workspaceId));
  const openEdit = (s: PartnerPortalSlide) => setEditing({ ...s });

  const handleSave = async () => {
    if (!editing || !editing.workspace_id || !editing.title) return;
    await upsert.mutateAsync(editing as any);
    setEditing(null);
  };

  if (!workspaceId) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground text-sm">
          Workspace não disponível.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>Banners do Portal</CardTitle>
            <CardDescription>
              Gerir os banners rotativos exibidos no dashboard do portal B2B (campanhas, formações, lançamentos).
            </CardDescription>
          </div>
          <Button onClick={openNew} size="sm">
            <Plus className="h-4 w-4 mr-2" /> Novo banner
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : slides.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm border border-dashed rounded-lg">
              <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
              Sem banners ainda. Cria o primeiro para aparecer no portal.
            </div>
          ) : (
            <div className="grid gap-3">
              {slides.map((s) => (
                <Card key={s.id} className="border-border/60">
                  <CardContent className="flex items-center gap-4 py-4">
                    <div className="w-24 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      {s.image_url ? (
                        <img src={s.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant="outline">{PARTNER_SLIDE_KIND_LABEL[s.kind]}</Badge>
                        {!s.is_active && <Badge variant="secondary">Inativo</Badge>}
                        <span className="text-xs text-muted-foreground">Ordem #{s.display_order}</span>
                      </div>
                      <p className="font-medium truncate">{s.title}</p>
                      {s.subtitle && <p className="text-sm text-muted-foreground truncate">{s.subtitle}</p>}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(s)} aria-label="Editar banner">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => confirm("Remover este banner?") && remove.mutate(s.id)}
                      aria-label="Remover banner"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar banner" : "Novo banner"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-1">
                <Label>Tipo</Label>
                <Select
                  value={editing.kind}
                  onValueChange={(v) => setEditing({ ...editing, kind: v as PartnerSlideKind })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PARTNER_SLIDE_KIND_LABEL).map(([k, l]) => (
                      <SelectItem key={k} value={k}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-1">
                <Label>Ordem</Label>
                <Input
                  type="number"
                  value={editing.display_order ?? 0}
                  onChange={(e) => setEditing({ ...editing, display_order: Number(e.target.value) })}
                />
              </div>
              <div className="col-span-2">
                <Label>Eyebrow (etiqueta pequena)</Label>
                <Input
                  value={editing.eyebrow || ""}
                  onChange={(e) => setEditing({ ...editing, eyebrow: e.target.value })}
                  placeholder="Ex.: Campanha do mês"
                />
              </div>
              <div className="col-span-2">
                <Label>Título *</Label>
                <Input
                  value={editing.title || ""}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <Label>Subtítulo</Label>
                <Input
                  value={editing.subtitle || ""}
                  onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <Label>Descrição</Label>
                <Textarea
                  rows={2}
                  value={editing.description || ""}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <Label>URL da imagem (1600x900 recomendado)</Label>
                <Input
                  value={editing.image_url || ""}
                  onChange={(e) => setEditing({ ...editing, image_url: e.target.value })}
                  placeholder="https://..."
                />
                {editing.image_url && (
                  <div className="mt-2 w-full aspect-[16/9] rounded-lg overflow-hidden bg-muted">
                    <img src={editing.image_url} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
              <div className="col-span-1">
                <Label>Texto do botão</Label>
                <Input
                  value={editing.cta_label || ""}
                  onChange={(e) => setEditing({ ...editing, cta_label: e.target.value })}
                />
              </div>
              <div className="col-span-1">
                <Label>Link do botão</Label>
                <Input
                  value={editing.cta_url || ""}
                  onChange={(e) => setEditing({ ...editing, cta_url: e.target.value })}
                  placeholder="/client/catalog ou https://..."
                />
              </div>
              <div className="col-span-2 flex items-center gap-3">
                <Switch
                  checked={!!editing.is_active}
                  onCheckedChange={(v) => setEditing({ ...editing, is_active: v })}
                />
                <Label>Ativo</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!editing?.title || upsert.isPending}>
              {upsert.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
