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
  Package,
  Repeat,
  Clock,
  Layers,
  GraduationCap,
  Boxes,
  Box,
  Lock,
} from "lucide-react";
import { useProductTypes, ProductTypeConfig, CreateProductTypeInput } from "@/hooks/useProductSettings";

const ICON_OPTIONS = [
  { value: 'Package', icon: Package, label: 'Pacote' },
  { value: 'Repeat', icon: Repeat, label: 'Repetir' },
  { value: 'Clock', icon: Clock, label: 'Relógio' },
  { value: 'Layers', icon: Layers, label: 'Camadas' },
  { value: 'GraduationCap', icon: GraduationCap, label: 'Formação' },
  { value: 'Boxes', icon: Boxes, label: 'Caixas' },
  { value: 'Box', icon: Box, label: 'Caixa' },
];

const getIconComponent = (iconName: string) => {
  const found = ICON_OPTIONS.find(i => i.value === iconName);
  return found?.icon || Package;
};

export function ProductTypesTab() {
  const { data: types, isLoading, create, update, delete: deleteType } = useProductTypes();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<ProductTypeConfig | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductTypeConfig | null>(null);

  const [formData, setFormData] = useState<CreateProductTypeInput>({
    code: '',
    label: '',
    description: '',
    icon: 'Package',
    color: '#3B82F6',
    is_active: true,
    position: 0,
  });

  const handleOpenCreate = () => {
    setEditingType(null);
    setFormData({
      code: '',
      label: '',
      description: '',
      icon: 'Package',
      color: '#3B82F6',
      is_active: true,
      position: types?.length || 0,
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (type: ProductTypeConfig) => {
    setEditingType(type);
    setFormData({
      code: type.code,
      label: type.label,
      description: type.description || '',
      icon: type.icon,
      color: type.color,
      is_active: type.is_active,
      position: type.position,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (editingType) {
      await update.mutateAsync({ id: editingType.id, ...formData });
    } else {
      await create.mutateAsync(formData);
    }
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (deleteTarget) {
      await deleteType.mutateAsync(deleteTarget.id);
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    }
  };

  const handleToggleActive = async (type: ProductTypeConfig) => {
    await update.mutateAsync({ id: type.id, is_active: !type.is_active });
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
          <h3 className="text-lg font-medium">Tipos de Produto</h3>
          <p className="text-sm text-muted-foreground">
            Configure os tipos de produtos disponíveis no catálogo
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Tipo
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">Ícone</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {types?.map((type) => {
              const IconComp = getIconComponent(type.icon);
              return (
                <TableRow key={type.id}>
                  <TableCell>
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: type.color + '20' }}
                    >
                      <IconComp className="h-4 w-4" style={{ color: type.color }} />
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{type.code}</TableCell>
                  <TableCell className="font-medium">
                    {type.label}
                    {type.is_system && (
                      <Lock className="h-3 w-3 inline-block ml-2 text-muted-foreground" />
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {type.description || '-'}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={type.is_active}
                      onCheckedChange={() => handleToggleActive(type)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(type)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {!type.is_system && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setDeleteTarget(type);
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingType ? 'Editar Tipo de Produto' : 'Novo Tipo de Produto'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Código</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase().replace(/\s/g, '-') })}
                  placeholder="ex: consultoria"
                  disabled={editingType?.is_system}
                />
              </div>
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder="ex: Consultoria"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição breve do tipo"
              />
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
              {editingType ? 'Guardar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar tipo de produto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser revertida. O tipo "{deleteTarget?.label}" será removido permanentemente.
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
