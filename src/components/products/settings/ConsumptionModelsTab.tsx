import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
  Calendar,
  Package,
  Clock,
  Infinity,
  Coins,
  Lock,
} from "lucide-react";
import { useConsumptionModels, ConsumptionModelConfig, CreateConsumptionModelInput } from "@/hooks/useProductSettings";

const ICON_OPTIONS = [
  { value: 'Calendar', icon: Calendar, label: 'Sessões' },
  { value: 'Package', icon: Package, label: 'Unidades' },
  { value: 'Clock', icon: Clock, label: 'Horas' },
  { value: 'Infinity', icon: Infinity, label: 'Ilimitado' },
  { value: 'Coins', icon: Coins, label: 'Créditos' },
];

const getIconComponent = (iconName: string) => {
  const found = ICON_OPTIONS.find(i => i.value === iconName);
  return found?.icon || Package;
};

export function ConsumptionModelsTab() {
  const { data: models, isLoading, create, update, delete: deleteModel } = useConsumptionModels();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ConsumptionModelConfig | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ConsumptionModelConfig | null>(null);

  const [formData, setFormData] = useState<CreateConsumptionModelInput>({
    code: '',
    label: '',
    description: '',
    is_trackable: true,
    unit_name: '',
    icon: 'Package',
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
      is_trackable: true,
      unit_name: '',
      icon: 'Package',
      color: '#3B82F6',
      is_active: true,
      position: models?.length || 0,
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (item: ConsumptionModelConfig) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      label: item.label,
      description: item.description || '',
      is_trackable: item.is_trackable,
      unit_name: item.unit_name || '',
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
      await deleteModel.mutateAsync(deleteTarget.id);
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    }
  };

  const handleToggleActive = async (item: ConsumptionModelConfig) => {
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
          <h3 className="text-lg font-medium">Modelos de Consumo</h3>
          <p className="text-sm text-muted-foreground">
            Configure como os produtos/serviços são consumidos
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Modelo
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">Ícone</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead>Rastreável</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {models?.map((item) => {
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
                  <TableCell className="text-muted-foreground">
                    {item.unit_name || '-'}
                  </TableCell>
                  <TableCell>
                    {item.is_trackable ? (
                      <Badge variant="secondary">Sim</Badge>
                    ) : (
                      <Badge variant="outline">Não</Badge>
                    )}
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
              {editingItem ? 'Editar Modelo' : 'Novo Modelo de Consumo'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Código</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase().replace(/\s/g, '_') })}
                  placeholder="ex: downloads"
                  disabled={editingItem?.is_system}
                />
              </div>
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder="ex: Downloads"
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
                <Label>Nome da Unidade</Label>
                <Input
                  value={formData.unit_name}
                  onChange={(e) => setFormData({ ...formData, unit_name: e.target.value })}
                  placeholder="ex: download"
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch
                  checked={formData.is_trackable}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_trackable: checked })}
                />
                <Label>Consumo rastreável</Label>
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
            <AlertDialogTitle>Eliminar modelo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser revertida. O modelo "{deleteTarget?.label}" será removido permanentemente.
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
