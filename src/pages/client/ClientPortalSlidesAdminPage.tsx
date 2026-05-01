import { useState } from "react";
import { ClientLayout } from "@/components/client-portal/ClientLayout";
import { useClientAuth } from "@/hooks/client-portal/useClientAuth";
import {
  useAllPartnerSlides,
  useUpsertPartnerSlide,
  useDeletePartnerSlide,
  PARTNER_SLIDE_KIND_LABEL,
  type PartnerPortalSlide,
  type PartnerSlideKind,
} from "@/hooks/usePartnerPortalSlides";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

export default function ClientPortalSlidesAdminPage() {
  const { clientUser } = useClientAuth();
  const wid = clientUser?.workspace_id;
  const { data: slides = [], isLoading } = useAllPartnerSlides(wid);
  const upsert = useUpsertPartnerSlide(wid);
  const remove = useDeletePartnerSlide();

  const [editing, setEditing] = useState<Partial<PartnerPortalSlide> | null>(null);

  const openNew = () => wid && setEditing(empty(wid));
  const openEdit = (s: PartnerPortalSlide) => setEditing({ ...s });

  const handleSave = async () => {
    if (!editing || !editing.workspace_id || !editing.title) return;
    await upsert.mutateAsync(editing as any);
    setEditing(null);
  };

  return (
    <ClientLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-editorial text-4xl tracking-tight">Slides do Portal</h1>
            <p className="text-muted-foreground mt-1">Gerir campanhas, formações, lançamentos e conteúdo educativo do hero.</p>
          </div>
          <Button onClick={openNew} className="rounded-full bg-[hsl(var(--editorial-ink))] text-[hsl(var(--editorial-cream))] hover:bg-[hsl(var(--editorial-ink))]/90">
            <Plus className="h-4 w-4 mr-2" /> Novo slide
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : slides.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">Sem slides ainda. Cria o primeiro para aparecer no dashboard.</CardContent></Card>
        ) : (
          <div className="grid gap-3">
            {slides.map((s) => (
              <Card key={s.id} className="border-[hsl(var(--editorial-border))]/60">
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="w-24 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    {s.image_url && <img src={s.image_url} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline">{PARTNER_SLIDE_KIND_LABEL[s.kind]}</Badge>
                      {!s.is_active && <Badge variant="secondary">Inativo</Badge>}
                      <span className="text-xs text-muted-foreground">#{s.display_order}</span>
                    </div>
                    <p className="font-medium truncate">{s.title}</p>
                    {s.subtitle && <p className="text-sm text-muted-foreground truncate">{s.subtitle}</p>}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => confirm("Remover este slide?") && remove.mutate(s.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-editorial text-2xl">{editing?.id ? "Editar slide" : "Novo slide"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-1">
                <Label>Tipo</Label>
                <Select value={editing.kind} onValueChange={(v) => setEditing({ ...editing, kind: v as PartnerSlideKind })}>
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
                <Input type="number" value={editing.display_order ?? 0} onChange={(e) => setEditing({ ...editing, display_order: Number(e.target.value) })} />
              </div>
              <div className="col-span-2">
                <Label>Eyebrow (etiqueta pequena)</Label>
                <Input value={editing.eyebrow || ""} onChange={(e) => setEditing({ ...editing, eyebrow: e.target.value })} placeholder="Ex.: Campanha do mês" />
              </div>
              <div className="col-span-2">
                <Label>Título *</Label>
                <Input value={editing.title || ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>Subtítulo</Label>
                <Input value={editing.subtitle || ""} onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>Descrição</Label>
                <Textarea rows={2} value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>URL da imagem (1600x900 recomendado)</Label>
                <Input value={editing.image_url || ""} onChange={(e) => setEditing({ ...editing, image_url: e.target.value })} placeholder="https://..." />
              </div>
              <div className="col-span-1">
                <Label>Texto do botão</Label>
                <Input value={editing.cta_label || ""} onChange={(e) => setEditing({ ...editing, cta_label: e.target.value })} />
              </div>
              <div className="col-span-1">
                <Label>Link do botão</Label>
                <Input value={editing.cta_url || ""} onChange={(e) => setEditing({ ...editing, cta_url: e.target.value })} placeholder="/client/catalog ou https://..." />
              </div>
              <div className="col-span-2 flex items-center gap-3">
                <Switch checked={!!editing.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
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
    </ClientLayout>
  );
}
