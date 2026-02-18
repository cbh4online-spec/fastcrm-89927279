import { useState } from "react";
import { ArrowLeft, Plus, Pencil, Trash2, Globe, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { useVertical } from "@/hooks/useVerticals";
import { useFunnels, useCreateFunnel, useDeleteFunnel } from "@/hooks/useFunnels";
import { FunnelBuilder } from "./FunnelBuilder";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

const FUNNEL_TYPE_LABELS: Record<string, string> = {
  leadgen: "Lead Gen",
  upsell: "Upsell",
  remarketing: "Remarketing",
  event: "Evento",
  checkout: "Checkout",
};

interface VerticalViewProps {
  verticalId: string;
  onBack: () => void;
}

export function VerticalView({ verticalId, onBack }: VerticalViewProps) {
  const { data: vertical } = useVertical(verticalId);
  const { data: allFunnels = [] } = useFunnels();
  const createFunnel = useCreateFunnel();
  const deleteFunnel = useDeleteFunnel();

  const funnels = allFunnels.filter((f) => f.vertical_id === verticalId);

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newType, setNewType] = useState("leadgen");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingFunnelId, setEditingFunnelId] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!newName || !newSlug) return;
    const result = await createFunnel.mutateAsync({
      name: newName,
      slug: newSlug,
      vertical_id: verticalId,
      type: newType,
    });
    setCreateOpen(false);
    setNewName("");
    setNewSlug("");
    setNewType("leadgen");
    setEditingFunnelId(result.id);
  };

  if (editingFunnelId) {
    return <FunnelBuilder funnelId={editingFunnelId} onBack={() => setEditingFunnelId(null)} />;
  }

  if (!vertical) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <button onClick={onBack} className="text-sm text-primary hover:underline flex items-center gap-1 mb-1">
            <ArrowLeft className="h-3 w-3" />
            Voltar
          </button>
          <div className="flex items-center gap-3 flex-wrap">
            <div
              className="w-4 h-4 rounded-full shrink-0"
              style={{ backgroundColor: vertical.color_theme || "#6366f1" }}
            />
            <h1 className="text-xl sm:text-2xl font-bold">{vertical.name}</h1>
            <Badge variant="outline">{funnels.length} funis</Badge>
          </div>
          {vertical.description && (
            <p className="text-muted-foreground mt-1 text-sm">{vertical.description}</p>
          )}
        </div>
        <Button onClick={() => setCreateOpen(true)} className="shrink-0 self-start sm:self-auto">
          <Plus className="h-4 w-4 mr-2" />
          Novo Funil
        </Button>
      </div>


      {!funnels.length ? (
        <Card className="flex flex-col items-center justify-center py-16">
          <Globe className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">Sem funis nesta vertical</h3>
          <p className="text-muted-foreground mb-4">Cria o primeiro funil para esta vertical</p>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Criar Funil
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {funnels.map((funnel) => (
            <Card
              key={funnel.id}
              className="group hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setEditingFunnelId(funnel.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{funnel.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">/{funnel.slug}</p>
                  </div>
                  <div className="flex gap-1">
                    <Badge variant="secondary" className="text-xs">
                      {FUNNEL_TYPE_LABELS[funnel.type] || funnel.type}
                    </Badge>
                    <Badge variant={funnel.is_published ? "default" : "outline"} className="text-xs">
                      {funnel.is_published ? "Live" : "Draft"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Atualizado {formatDistanceToNow(new Date(funnel.updated_at), { addSuffix: true, locale: pt })}
                </p>
                <div className="flex items-center gap-2 pt-3 border-t mt-3" onClick={(e) => e.stopPropagation()}>
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => setEditingFunnelId(funnel.id)}>
                    <Pencil className="h-3 w-3 mr-1" />
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteId(funnel.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Funil — {vertical.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value);
                  setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));
                }}
                placeholder="Ex: Lead Gen Principal"
              />
            </div>
            <div>
              <Label>Slug</Label>
              <Input value={newSlug} onChange={(e) => setNewSlug(e.target.value)} placeholder="lead-gen-principal" />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={newType} onValueChange={setNewType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="leadgen">Lead Gen</SelectItem>
                  <SelectItem value="upsell">Upsell</SelectItem>
                  <SelectItem value="remarketing">Remarketing</SelectItem>
                  <SelectItem value="event">Evento</SelectItem>
                  <SelectItem value="checkout">Checkout</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!newName || !newSlug || createFunnel.isPending}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Funil</AlertDialogTitle>
            <AlertDialogDescription>Esta acção é permanente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deleteId) { deleteFunnel.mutate(deleteId); setDeleteId(null); } }}
              className="bg-destructive text-destructive-foreground"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
