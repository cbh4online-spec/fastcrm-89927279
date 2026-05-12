import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  type LeadChefProductRow,
  useUpsertLeadChefProduct,
} from "@/hooks/leadchef/useLeadChefProducts";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  workspaceId: string | undefined;
  product?: LeadChefProductRow | null;
}

export function LeadChefProductDialog({ open, onOpenChange, workspaceId, product }: Props) {
  const upsert = useUpsertLeadChefProduct(workspaceId);
  const [name, setName] = useState("");
  const [points, setPoints] = useState<string>("0");
  const [price, setPrice] = useState<string>("0");
  const [promo, setPromo] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState<string>("0");
  const [category, setCategory] = useState("");

  useEffect(() => {
    if (open) {
      setName(product?.name ?? "");
      setPoints(String(product?.points ?? 0));
      setPrice(String(product?.price ?? 0));
      setPromo(product?.promo ?? false);
      setIsActive(product?.is_active ?? true);
      setSortOrder(String(product?.sort_order ?? 0));
      setCategory(product?.category ?? "");
    }
  }, [open, product]);

  const submit = async () => {
    if (!name.trim()) return;
    await upsert.mutateAsync({
      id: product?.id,
      name,
      points: Number(points) || 0,
      price: Number(price) || 0,
      promo,
      is_active: isActive,
      sort_order: Number(sortOrder) || 0,
      category: category || null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{product ? "Editar produto" : "Novo produto"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="p-name">Nome</Label>
            <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="p-pts">Pontos</Label>
              <Input id="p-pts" type="number" min={0} value={points} onChange={(e) => setPoints(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="p-price">Preço (€)</Label>
              <Input id="p-price" type="number" min={0} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="p-cat">Categoria (opcional)</Label>
            <Input id="p-cat" value={category} onChange={(e) => setCategory(e.target.value)} maxLength={60} />
          </div>
          <div>
            <Label htmlFor="p-sort">Ordem</Label>
            <Input id="p-sort" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Promoção</p>
              <p className="text-xs text-muted-foreground">Marca o produto como promo.</p>
            </div>
            <Switch checked={promo} onCheckedChange={setPromo} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Ativo</p>
              <p className="text-xs text-muted-foreground">Mostrar na lista de consulta.</p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={upsert.isPending || !name.trim()}>
            {upsert.isPending ? "A guardar…" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
