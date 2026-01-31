import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useProtocols } from "@/hooks/useProtocols";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { calculateProtocolTotal } from "@/types/protocol";
import type { ProductProtocol } from "@/types/protocol";
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Loader2, 
  Package,
  Percent,
  GripVertical,
  Eye,
  EyeOff
} from "lucide-react";
import { cn } from "@/lib/utils";

export function ProtocolsManager() {
  const { currentWorkspace } = useWorkspace();
  const { 
    protocols, 
    loading, 
    createProtocol, 
    updateProtocol, 
    deleteProtocol,
    isCreating 
  } = useProtocols();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProtocol, setEditingProtocol] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    code: "",
    description: "",
    short_description: "",
    discount_percentage: 0,
    category: "",
    tags: "",
  });

  const resetForm = () => {
    setForm({
      name: "",
      code: "",
      description: "",
      short_description: "",
      discount_percentage: 0,
      category: "",
      tags: "",
    });
    setEditingProtocol(null);
  };

  const handleCreate = async () => {
    if (!currentWorkspace?.id || !form.name || !form.code) return;

    const tagsArray = form.tags
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t);

    if (editingProtocol) {
      await updateProtocol({
        id: editingProtocol,
        data: {
          name: form.name,
          description: form.description || undefined,
          short_description: form.short_description || undefined,
          discount_percentage: form.discount_percentage,
          category: form.category || undefined,
          tags: tagsArray.length > 0 ? tagsArray : undefined,
        },
      });
    } else {
      await createProtocol({
        workspace_id: currentWorkspace.id,
        name: form.name,
        code: form.code.toUpperCase().replace(/\s+/g, "-"),
        description: form.description || undefined,
        short_description: form.short_description || undefined,
        discount_percentage: form.discount_percentage,
        category: form.category || undefined,
        tags: tagsArray.length > 0 ? tagsArray : undefined,
      });
    }

    setDialogOpen(false);
    resetForm();
  };

  const handleEdit = (protocol: ProductProtocol) => {
    setEditingProtocol(protocol.id);
    setForm({
      name: protocol.name,
      code: protocol.code,
      description: protocol.description || "",
      short_description: protocol.short_description || "",
      discount_percentage: protocol.discount_percentage,
      category: protocol.category || "",
      tags: protocol.tags?.join(", ") || "",
    });
    setDialogOpen(true);
  };

  const handleToggleActive = async (id: string, is_active: boolean) => {
    await updateProtocol({ id, data: { is_active } });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Protocolos / Kits
            </CardTitle>
            <CardDescription>
              Crie bundles de produtos para venda conjunta com desconto
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Protocolo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingProtocol ? "Editar Protocolo" : "Criar Novo Protocolo"}
                </DialogTitle>
                <DialogDescription>
                  Configure um bundle de produtos para venda conjunta
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome *</Label>
                    <Input
                      id="name"
                      placeholder="Ex: Protocolo AAG"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="code">Código *</Label>
                    <Input
                      id="code"
                      placeholder="Ex: PROT-AAG"
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                      disabled={!!editingProtocol}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="short_description">Descrição curta</Label>
                  <Input
                    id="short_description"
                    placeholder="Resumo para listagens..."
                    value={form.short_description}
                    onChange={(e) => setForm({ ...form, short_description: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição completa</Label>
                  <Textarea
                    id="description"
                    placeholder="Descrição detalhada do protocolo..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="discount">Desconto (%)</Label>
                    <Input
                      id="discount"
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={form.discount_percentage}
                      onChange={(e) => setForm({ ...form, discount_percentage: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Categoria</Label>
                    <Input
                      id="category"
                      placeholder="Ex: Capilar"
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
                  <Input
                    id="tags"
                    placeholder="queda, alopécia, fortalecimento"
                    value={form.tags}
                    onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreate} disabled={isCreating || !form.name || !form.code}>
                  {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingProtocol ? "Guardar" : "Criar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {protocols.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p>Nenhum protocolo configurado</p>
            <p className="text-sm">Crie protocolos para vender bundles de produtos</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {protocols.map((protocol) => {
                const products = protocol.products || [];
                const productCount = products.reduce((sum, p) => sum + p.quantity, 0);
                const { total } = calculateProtocolTotal(products, protocol.discount_percentage);

                return (
                  <div
                    key={protocol.id}
                    className={cn(
                      "flex items-center gap-4 p-4 border rounded-lg transition-colors",
                      !protocol.is_active && "opacity-60 bg-muted/50"
                    )}
                  >
                    <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                    
                    {protocol.image_url ? (
                      <img
                        src={protocol.image_url}
                        alt={protocol.name}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Package className="h-8 w-8 text-primary/60" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{protocol.name}</h3>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {protocol.code}
                        </code>
                        {protocol.category && (
                          <Badge variant="outline">{protocol.category}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {protocol.short_description || protocol.description || "Sem descrição"}
                      </p>
                      <div className="flex items-center gap-4 mt-1 text-sm">
                        <span className="text-muted-foreground">
                          {productCount} produto{productCount !== 1 && "s"}
                        </span>
                        {protocol.discount_percentage > 0 && (
                          <Badge variant="secondary" className="bg-green-100 text-green-700">
                            <Percent className="h-3 w-3 mr-0.5" />
                            {protocol.discount_percentage}% desc.
                          </Badge>
                        )}
                        {total > 0 && (
                          <span className="font-semibold text-primary">
                            {total.toLocaleString("pt-PT", {
                              style: "currency",
                              currency: "EUR",
                            })}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleActive(protocol.id, !protocol.is_active)}
                        title={protocol.is_active ? "Desativar" : "Ativar"}
                      >
                        {protocol.is_active ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(protocol)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteProtocol(protocol.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
