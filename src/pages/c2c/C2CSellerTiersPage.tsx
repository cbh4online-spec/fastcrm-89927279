import { useState } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useSellerTiers, useUpsertSellerTier, useDeleteSellerTier } from "@/hooks/useC2CSellerTiers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Crown, Plus, Pencil, Trash2, Loader2, Package, Image, Percent, DollarSign } from "lucide-react";

interface TierForm {
  id?: string;
  tier_name: string;
  max_active_listings: number;
  max_photos_per_listing: number;
  commission_rate: number;
  price_monthly: number;
}

const emptyTier: TierForm = {
  tier_name: "", max_active_listings: 5, max_photos_per_listing: 5, commission_rate: 10, price_monthly: 0,
};

export default function C2CSellerTiersPage() {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;
  const { data: tiers = [], isLoading } = useSellerTiers(wid);
  const upsert = useUpsertSellerTier();
  const deleteTier = useDeleteSellerTier();
  const [editDialog, setEditDialog] = useState<TierForm | null>(null);

  const handleSave = () => {
    if (!editDialog || !wid) return;
    upsert.mutate({
      ...editDialog,
      workspace_id: wid,
    });
    setEditDialog(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Crown className="h-6 w-6" /> Tiers de Vendedores
          </h1>
          <p className="text-sm text-muted-foreground">Gerir planos e limites dos vendedores</p>
        </div>
        <Button onClick={() => setEditDialog({ ...emptyTier })} className="gap-1.5">
          <Plus className="h-4 w-4" /> Novo Tier
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : tiers.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            <Crown className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Nenhum tier configurado</p>
            <Button variant="outline" className="mt-4" onClick={() => setEditDialog({ ...emptyTier })}>
              Criar primeiro tier
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tiers.map((tier: any) => (
            <Card key={tier.id} className="relative">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-amber-500" />
                    {tier.tier_name}
                  </span>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7"
                      onClick={() => setEditDialog({
                        id: tier.id, tier_name: tier.tier_name,
                        max_active_listings: tier.max_active_listings,
                        max_photos_per_listing: tier.max_photos_per_listing,
                        commission_rate: Number(tier.commission_rate),
                        price_monthly: tier.price_monthly || 0,
                      })}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                      onClick={() => deleteTier.mutate(tier.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span>{tier.max_active_listings} anúncios ativos</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Image className="h-4 w-4 text-muted-foreground" />
                  <span>{tier.max_photos_per_listing} fotos/anúncio</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Percent className="h-4 w-4 text-muted-foreground" />
                  <span>{tier.commission_rate}% comissão</span>
                </div>
                <div className="flex items-center gap-2 text-sm font-medium pt-2 border-t">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span>{tier.price_monthly ? `${(tier.price_monthly / 100).toFixed(2)}€/mês` : "Gratuito"}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editDialog} onOpenChange={() => setEditDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editDialog?.id ? "Editar" : "Novo"} Tier</DialogTitle>
          </DialogHeader>
          {editDialog && (
            <div className="space-y-4">
              <div>
                <Label>Nome do Tier</Label>
                <Input value={editDialog.tier_name} onChange={e => setEditDialog({ ...editDialog, tier_name: e.target.value })} placeholder="Ex: Pro" className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Max. Anúncios</Label>
                  <Input type="number" value={editDialog.max_active_listings} onChange={e => setEditDialog({ ...editDialog, max_active_listings: Number(e.target.value) })} className="mt-1" />
                </div>
                <div>
                  <Label>Max. Fotos</Label>
                  <Input type="number" value={editDialog.max_photos_per_listing} onChange={e => setEditDialog({ ...editDialog, max_photos_per_listing: Number(e.target.value) })} className="mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Comissão (%)</Label>
                  <Input type="number" step="0.5" value={editDialog.commission_rate} onChange={e => setEditDialog({ ...editDialog, commission_rate: Number(e.target.value) })} className="mt-1" />
                </div>
                <div>
                  <Label>Preço mensal (cêntimos)</Label>
                  <Input type="number" value={editDialog.price_monthly} onChange={e => setEditDialog({ ...editDialog, price_monthly: Number(e.target.value) })} className="mt-1" />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setEditDialog(null)}>Cancelar</Button>
                <Button onClick={handleSave} disabled={!editDialog.tier_name}>Guardar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
