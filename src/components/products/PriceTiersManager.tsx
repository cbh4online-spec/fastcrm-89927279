import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePriceTiers } from "@/hooks/useClientPricing";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { tierColorPresets } from "@/types/pricing-tier";
import { Plus, Trash2, Edit2, Loader2, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

export function PriceTiersManager() {
  const { currentWorkspace } = useWorkspace();
  const { tiers, loading, createTier, updateTier, deleteTier, isCreating } = usePriceTiers();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    code: "",
    description: "",
    discount_percentage: 0,
    color: "#6366f1",
    priority: 0,
    is_default: false,
  });

  const resetForm = () => {
    setForm({
      name: "",
      code: "",
      description: "",
      discount_percentage: 0,
      color: "#6366f1",
      priority: 0,
      is_default: false,
    });
    setEditingTier(null);
  };

  const handleCreate = async () => {
    if (!currentWorkspace?.id || !form.name || !form.code) return;

    if (editingTier) {
      await updateTier({
        id: editingTier,
        data: {
          name: form.name,
          description: form.description || undefined,
          discount_percentage: form.discount_percentage,
          color: form.color,
          priority: form.priority,
          is_default: form.is_default,
        },
      });
    } else {
      await createTier({
        workspace_id: currentWorkspace.id,
        name: form.name,
        code: form.code.toUpperCase(),
        description: form.description || undefined,
        discount_percentage: form.discount_percentage,
        color: form.color,
        priority: form.priority,
        is_default: form.is_default,
      });
    }

    setDialogOpen(false);
    resetForm();
  };

  const handleEdit = (tier: typeof tiers[0]) => {
    setEditingTier(tier.id);
    setForm({
      name: tier.name,
      code: tier.code,
      description: tier.description || "",
      discount_percentage: tier.discount_percentage,
      color: tier.color,
      priority: tier.priority,
      is_default: tier.is_default,
    });
    setDialogOpen(true);
  };

  const handleToggleActive = async (id: string, is_active: boolean) => {
    await updateTier({ id, data: { is_active } });
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
              <Crown className="h-5 w-5" />
              Escalões de Preço
            </CardTitle>
            <CardDescription>
              Defina escalões para aplicar descontos automáticos por tipo de cliente
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Escalão
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingTier ? "Editar Escalão" : "Criar Novo Escalão"}
                </DialogTitle>
                <DialogDescription>
                  Defina os detalhes do escalão de preço
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome</Label>
                    <Input
                      id="name"
                      placeholder="Ex: Gold"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="code">Código</Label>
                    <Input
                      id="code"
                      placeholder="Ex: GOLD"
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                      disabled={!!editingTier}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Input
                    id="description"
                    placeholder="Descrição do escalão..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
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
                    <Label htmlFor="priority">Prioridade</Label>
                    <Input
                      id="priority"
                      type="number"
                      value={form.priority}
                      onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Cor</Label>
                  <div className="flex gap-2">
                    {tierColorPresets.map((preset) => (
                      <button
                        key={preset.color}
                        type="button"
                        className={cn(
                          "w-8 h-8 rounded-full border-2 transition-transform",
                          form.color === preset.color ? "scale-110 border-foreground" : "border-transparent"
                        )}
                        style={{ backgroundColor: preset.color }}
                        onClick={() => setForm({ ...form, color: preset.color })}
                        title={preset.name}
                      />
                    ))}
                    <Input
                      type="color"
                      value={form.color}
                      onChange={(e) => setForm({ ...form, color: e.target.value })}
                      className="w-8 h-8 p-0 border-0"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="default">Escalão padrão para novos clientes</Label>
                  <Switch
                    id="default"
                    checked={form.is_default}
                    onCheckedChange={(checked) => setForm({ ...form, is_default: checked })}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreate} disabled={isCreating || !form.name || !form.code}>
                  {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingTier ? "Guardar" : "Criar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {tiers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Crown className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p>Nenhum escalão de preço configurado</p>
            <p className="text-sm">Crie escalões para oferecer preços diferenciados</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Escalão</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Desconto</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tiers.map((tier) => (
                <TableRow key={tier.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: tier.color }}
                      />
                      <span className="font-medium">{tier.name}</span>
                      {tier.is_default && (
                        <Badge variant="secondary" className="text-xs">
                          Padrão
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                      {tier.code}
                    </code>
                  </TableCell>
                  <TableCell>
                    <Badge
                      style={{
                        backgroundColor: `${tier.color}20`,
                        color: tier.color,
                      }}
                    >
                      {tier.discount_percentage}%
                    </Badge>
                  </TableCell>
                  <TableCell>{tier.priority}</TableCell>
                  <TableCell>
                    <Switch
                      checked={tier.is_active}
                      onCheckedChange={(checked) => handleToggleActive(tier.id, checked)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(tier)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteTier(tier.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
