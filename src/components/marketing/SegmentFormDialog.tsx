import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Target, Plus, Trash2 } from 'lucide-react';
import { useCreateSegment, useUpdateSegment } from '@/hooks/useMarketingSegments';
import type { MarketingSegment, SegmentCondition } from '@/types/marketing';

interface SegmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  segment?: MarketingSegment | null;
  onClose: () => void;
}

const FIELD_OPTIONS = [
  { value: 'tags', label: 'Tags' },
  { value: 'company', label: 'Empresa' },
  { value: 'job_title', label: 'Cargo' },
  { value: 'city', label: 'Cidade' },
  { value: 'source', label: 'Origem' },
];

const OPERATOR_OPTIONS = [
  { value: 'equals', label: 'É igual a' },
  { value: 'not_equals', label: 'Não é igual a' },
  { value: 'contains', label: 'Contém' },
  { value: 'not_contains', label: 'Não contém' },
  { value: 'is_empty', label: 'Está vazio' },
  { value: 'is_not_empty', label: 'Não está vazio' },
];

export function SegmentFormDialog({
  open,
  onOpenChange,
  segment,
  onClose,
}: SegmentFormDialogProps) {
  const createSegment = useCreateSegment();
  const updateSegment = useUpdateSegment();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isDynamic: true,
    logic: 'AND' as 'AND' | 'OR',
    conditions: [] as SegmentCondition[],
  });

  useEffect(() => {
    if (open) {
      if (segment) {
        setFormData({
          name: segment.name,
          description: segment.description || '',
          isDynamic: segment.isDynamic,
          logic: segment.filterRules?.logic || 'AND',
          conditions: segment.filterRules?.conditions || [],
        });
      } else {
        setFormData({
          name: '',
          description: '',
          isDynamic: true,
          logic: 'AND',
          conditions: [{ field: 'tags', operator: 'contains', value: '' }],
        });
      }
    }
  }, [open, segment]);

  const addCondition = () => {
    setFormData({
      ...formData,
      conditions: [
        ...formData.conditions,
        { field: 'tags', operator: 'contains', value: '' },
      ],
    });
  };

  const removeCondition = (index: number) => {
    setFormData({
      ...formData,
      conditions: formData.conditions.filter((_, i) => i !== index),
    });
  };

  const updateCondition = (index: number, updates: Partial<SegmentCondition>) => {
    const newConditions = [...formData.conditions];
    newConditions[index] = { ...newConditions[index], ...updates };
    setFormData({ ...formData, conditions: newConditions });
  };

  const handleSubmit = async () => {
    if (!formData.name || formData.conditions.length === 0) {
      return;
    }

    try {
      const filterRules = {
        logic: formData.logic,
        conditions: formData.conditions,
      };

      if (segment) {
        await updateSegment.mutateAsync({
          id: segment.id,
          name: formData.name,
          description: formData.description || undefined,
          isDynamic: formData.isDynamic,
          filterRules,
        });
      } else {
        await createSegment.mutateAsync({
          name: formData.name,
          description: formData.description || undefined,
          isDynamic: formData.isDynamic,
          filterRules,
        });
      }
      onClose();
    } catch (error) {
      console.error('Error saving segment:', error);
    }
  };

  const isPending = createSegment.isPending || updateSegment.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {segment ? 'Editar Segmento' : 'Novo Segmento'}
          </DialogTitle>
          <DialogDescription>
            {segment
              ? 'Edita as regras do segmento'
              : 'Cria um novo segmento para agrupar contactos'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic info */}
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome do Segmento *</Label>
              <Input
                id="name"
                placeholder="Ex: Clientes Porto"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                placeholder="Descrição opcional do segmento"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Segmento Dinâmico</Label>
                <p className="text-xs text-muted-foreground">
                  Atualiza automaticamente conforme os contactos mudam
                </p>
              </div>
              <Switch
                checked={formData.isDynamic}
                onCheckedChange={(checked) => setFormData({ ...formData, isDynamic: checked })}
              />
            </div>
          </div>

          {/* Conditions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Condições</Label>
              <Select
                value={formData.logic}
                onValueChange={(value: 'AND' | 'OR') => setFormData({ ...formData, logic: value })}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AND">E (todas)</SelectItem>
                  <SelectItem value="OR">OU (qualquer)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              {formData.conditions.map((condition, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Select
                    value={condition.field}
                    onValueChange={(value) => updateCondition(index, { field: value })}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FIELD_OPTIONS.map((field) => (
                        <SelectItem key={field.value} value={field.value}>
                          {field.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={condition.operator}
                    onValueChange={(value) => updateCondition(index, { operator: value as any })}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OPERATOR_OPTIONS.map((op) => (
                        <SelectItem key={op.value} value={op.value}>
                          {op.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {!['is_empty', 'is_not_empty'].includes(condition.operator) && (
                    <Input
                      placeholder="Valor"
                      value={(condition.value as string) || ''}
                      onChange={(e) => updateCondition(index, { value: e.target.value })}
                      className="flex-1"
                    />
                  )}

                  {formData.conditions.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCondition(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <Button variant="outline" size="sm" onClick={addCondition}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Condição
            </Button>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || !formData.name || formData.conditions.length === 0}
          >
            {isPending ? 'A guardar...' : segment ? 'Guardar Alterações' : 'Criar Segmento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
