import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Clock,
  Zap,
  Lock,
} from "lucide-react";
import { usePaymentConditions, PaymentConditionConfig, CreatePaymentConditionInput } from "@/hooks/useProductSettings";

const ICON_OPTIONS = [
  { value: 'Clock', icon: Clock, label: 'Relógio' },
  { value: 'Zap', icon: Zap, label: 'Raio' },
];

const getIconComponent = (iconName: string) => {
  const found = ICON_OPTIONS.find(i => i.value === iconName);
  return found?.icon || Clock;
};

export function PaymentConditionsTab() {
  const { data: conditions, isLoading, create, update, delete: deleteCondition } = usePaymentConditions();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PaymentConditionConfig | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PaymentConditionConfig | null>(null);

  const [formData, setFormData] = useState<CreatePaymentConditionInput>({
    code: '',
    label: '',
    description: '',
    days: 0,
    discount_pct: undefined,
    icon: 'Clock',
    color: '#3B82F6',
    is_active: true,
    position: 0,
  });

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({
      code: '',
      label: '',
      description: '',
      days: 0,
      discount_pct: undefined,
      icon: 'Clock',
      color: '#3B82F6',
      is_active: true,
      position: conditions?.length || 0,
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (item: PaymentConditionConfig) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      label: item.label,
      description: item.description || '',
      days: item.days,
      discount_pct: item.discount_pct || undefined,
      icon: item.icon,
      color: item.color,
      is_active: item.is_active,
      position: item.position,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (editingItem) {
      await update.mutateAsync({ id: editingItem.id, ...formData });
    } else {
      await create.mutateAsync(formData);
    }
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (deleteTarget) {
      await deleteCondition.mutateAsync(deleteTarget.id);
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    }
  };

  const handleToggleActive = async (item: PaymentConditionConfig) => {
    await update.mutateAsync({ id: item.id, is_active: !item.is_active });
  };

  if (isLoading) {
    return (
      <Card className="p-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Condições de Pagamento</h3>
          <p className="text-sm text-muted-foreground">
            Configure os prazos de pagamento disponíveis
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Condição
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">Ícone</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Dias</TableHead>
              <TableHead>Desconto</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {conditions?.map((item) => {
              const IconComp = getIconComponent(item.icon);
              return (
                <TableRow key={item.id}>
                  <TableCell>
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: item.color + '20' }}
                    >
                      <IconComp className="h-4 w-4" style={{ color: item.color }} />
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{item.code}</TableCell>
                  <TableCell className="font-medium">
                    {item.label}
                    {item.is_system && (
                      <Lock className="h-3 w-3 inline-block ml-2 text-muted-foreground" />
                    )}
                  </TableCell>
                  <TableCell>{item.days} dias</TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.discount_pct ? `${item.discount_pct}%` : '-'}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={item.is_active}
                      onCheckedChange={() => handleToggleActive(item)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(item)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {!item.is_system && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setDeleteTarget(item);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Editar Condição' : 'Nova Condição de Pagamento'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Código</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase().replace(/\s/g, '_') })}
                  placeholder="ex: 30_dias"
                  disabled={editingItem?.is_system}
                />
              </div>
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder="ex: 30 dias"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição breve"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Dias para Pagamento</Label>
                <Input
                  type="number"
                  value={formData.days}
                  onChange={(e) => setFormData({ ...formData, days: parseInt(e.target.value) || 0 })}
                  min={0}
                />
              </div>
              <div className="space-y-2">
                <Label>Desconto (%)</Label>
                <Input
                  type="number"
                  value={formData.discount_pct || ''}
                  onChange={(e) => setFormData({ ...formData, discount_pct: parseFloat(e.target.value) || undefined })}
                  placeholder="Ex: 2.5"
                  step="0.1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ícone</Label>
                <div className="flex flex-wrap gap-2">
                  {ICON_OPTIONS.map((opt) => {
                    const IconOpt = opt.icon;
                    return (
                      <Button
                        key={opt.value}
                        type="button"
                        variant={formData.icon === opt.value ? 'default' : 'outline'}
                        size="icon"
                        onClick={() => setFormData({ ...formData, icon: opt.value })}
                      >
                        <IconOpt className="h-4 w-4" />
                      </Button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Cor</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-10 h-10 rounded cursor-pointer border"
                  />
                  <Input
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label>Ativo</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.code || !formData.label || create.isPending || update.isPending}
            >
              {(create.isPending || update.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingItem ? 'Guardar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar condição?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser revertida. A condição "{deleteTarget?.label}" será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
