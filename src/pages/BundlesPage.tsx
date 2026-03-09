import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useProtocols } from "@/hooks/useProtocols";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { calculateProtocolTotal } from "@/types/protocol";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Package, Plus, Search, Percent, ShoppingBag, Trash2,
  Edit, ToggleLeft, ToggleRight,
} from "lucide-react";
import { toast } from "sonner";

export default function BundlesPage() {
  const { currentWorkspace } = useWorkspace();
  const {
    protocols, loading, createProtocol, updateProtocol, deleteProtocol,
    isCreating,
  } = useProtocols();

  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDiscount, setNewDiscount] = useState(0);

  const filtered = protocols.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    if (!currentWorkspace?.id || !newName.trim() || !newCode.trim()) return;
    try {
      await createProtocol({
        workspace_id: currentWorkspace.id,
        name: newName.trim(),
        code: newCode.trim().toUpperCase(),
        description: newDesc.trim() || undefined,
        discount_percentage: newDiscount,
      });
      setCreateOpen(false);
      setNewName("");
      setNewCode("");
      setNewDesc("");
      setNewDiscount(0);
    } catch {
      // error handled by hook
    }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      await updateProtocol({ id, data: { is_active: !isActive } });
    } catch {
      toast.error("Erro ao alterar estado");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Eliminar este pacote?")) return;
    try {
      await deleteProtocol(id);
    } catch {
      // handled by hook
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="h-5 w-5 text-primary" />
            <div>
              <h1 className="text-xl font-semibold text-foreground">Pacotes & Bundles</h1>
              <p className="text-sm text-muted-foreground">
                Cria pacotes de produtos com descontos automáticos
              </p>
            </div>
          </div>

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Novo Pacote
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Pacote</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label>Nome</Label>
                  <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex: Kit Starter" />
                </div>
                <div className="space-y-1.5">
                  <Label>Código</Label>
                  <Input value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="Ex: KIT-START" />
                </div>
                <div className="space-y-1.5">
                  <Label>Descrição</Label>
                  <Textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Descrição do pacote..." rows={3} />
                </div>
                <div className="space-y-1.5">
                  <Label>Desconto (%)</Label>
                  <Input type="number" min={0} max={100} value={newDiscount} onChange={(e) => setNewDiscount(Number(e.target.value))} />
                </div>
                <Button onClick={handleCreate} disabled={isCreating || !newName.trim() || !newCode.trim()} className="w-full">
                  {isCreating ? "A criar..." : "Criar Pacote"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar pacotes..." className="pl-9" />
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium text-foreground">
                {search ? "Nenhum pacote encontrado" : "Sem pacotes criados"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {search ? "Tenta com outro termo" : "Cria o primeiro pacote para agrupar produtos com descontos"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((protocol) => {
              const products = protocol.products ?? [];
              const { subtotal, discount, total } = calculateProtocolTotal(products, protocol.discount_percentage);

              return (
                <Card key={protocol.id} className="relative group">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-sm font-semibold truncate">{protocol.name}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">{protocol.code}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge variant={protocol.is_active ? "default" : "secondary"} className="text-[10px]">
                          {protocol.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {protocol.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{protocol.description}</p>
                    )}

                    {/* Products */}
                    <div className="space-y-1">
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                        Produtos ({products.length})
                      </p>
                      {products.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">Sem produtos adicionados</p>
                      ) : (
                        <div className="space-y-1">
                          {products.slice(0, 3).map((pp) => (
                            <div key={pp.id} className="flex items-center justify-between text-xs">
                              <span className="text-foreground truncate flex-1">
                                <ShoppingBag className="h-3 w-3 inline mr-1 text-muted-foreground" />
                                {pp.product?.name ?? "—"}
                                {pp.quantity > 1 && <span className="text-muted-foreground"> ×{pp.quantity}</span>}
                              </span>
                              <span className="text-muted-foreground shrink-0 ml-2">
                                €{((pp.product?.base_price ?? 0) * pp.quantity).toFixed(2)}
                              </span>
                            </div>
                          ))}
                          {products.length > 3 && (
                            <p className="text-[10px] text-muted-foreground">+{products.length - 3} mais</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Pricing */}
                    {products.length > 0 && (
                      <div className="rounded-lg bg-muted/30 p-2 space-y-1 text-xs">
                        <div className="flex justify-between text-muted-foreground">
                          <span>Subtotal</span>
                          <span>€{subtotal.toFixed(2)}</span>
                        </div>
                        {protocol.discount_percentage > 0 && (
                          <div className="flex justify-between text-emerald-500">
                            <span className="flex items-center gap-1">
                              <Percent className="h-3 w-3" />
                              Desconto ({protocol.discount_percentage}%)
                            </span>
                            <span>-€{discount.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-semibold text-foreground border-t border-border/30 pt-1">
                          <span>Total</span>
                          <span>€{total.toFixed(2)}</span>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 pt-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 text-xs flex-1"
                        onClick={() => handleToggle(protocol.id, protocol.is_active)}
                      >
                        {protocol.is_active ? <ToggleRight className="h-3 w-3" /> : <ToggleLeft className="h-3 w-3" />}
                        {protocol.is_active ? "Desativar" : "Ativar"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-destructive hover:text-destructive"
                        onClick={() => handleDelete(protocol.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
