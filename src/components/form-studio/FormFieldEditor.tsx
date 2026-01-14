import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { FormField, FormFieldType, FIELD_TYPE_LABELS } from '@/types/formSchema';
import { Plus, X } from 'lucide-react';

interface FormFieldEditorProps {
  field?: FormField;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (field: FormField) => void;
}

const FIELD_TYPES: FormFieldType[] = [
  'text', 'textarea', 'number', 'currency', 'date', 'datetime',
  'boolean', 'select', 'multiselect', 'email', 'phone', 'url'
];

export function FormFieldEditor({ field, open, onOpenChange, onSave }: FormFieldEditorProps) {
  const [label, setLabel] = useState(field?.label || '');
  const [type, setType] = useState<FormFieldType>(field?.type || 'text');
  const [required, setRequired] = useState(field?.required || false);
  const [placeholder, setPlaceholder] = useState(field?.placeholder || '');
  const [helpText, setHelpText] = useState(field?.helpText || '');
  const [options, setOptions] = useState<{ label: string; value: string }[]>(
    field?.options || [{ label: '', value: '' }]
  );

  const needsOptions = type === 'select' || type === 'multiselect';

  const handleSave = () => {
    const newField: FormField = {
      id: field?.id || crypto.randomUUID(),
      label,
      type,
      required,
      placeholder: placeholder || undefined,
      helpText: helpText || undefined,
      options: needsOptions ? options.filter(o => o.label && o.value) : undefined,
    };
    onSave(newField);
    onOpenChange(false);
  };

  const addOption = () => {
    setOptions([...options, { label: '', value: '' }]);
  };

  const updateOption = (index: number, key: 'label' | 'value', value: string) => {
    const updated = [...options];
    updated[index] = { ...updated[index], [key]: value };
    if (key === 'label' && !updated[index].value) {
      updated[index].value = value.toLowerCase().replace(/\s+/g, '_');
    }
    setOptions(updated);
  };

  const removeOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{field ? 'Editar campo' : 'Novo campo'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="label">Etiqueta</Label>
            <Input
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ex: Nome completo"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Tipo de campo</Label>
            <Select value={type} onValueChange={(v) => setType(v as FormFieldType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {FIELD_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {needsOptions && (
            <div className="space-y-2">
              <Label>Opções</Label>
              <div className="space-y-2">
                {options.map((option, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={option.label}
                      onChange={(e) => updateOption(index, 'label', e.target.value)}
                      placeholder="Etiqueta"
                      className="flex-1"
                    />
                    <Input
                      value={option.value}
                      onChange={(e) => updateOption(index, 'value', e.target.value)}
                      placeholder="Valor"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeOption(index)}
                      disabled={options.length <= 1}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addOption}>
                  <Plus className="h-4 w-4 mr-1" /> Adicionar opção
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="placeholder">Placeholder (opcional)</Label>
            <Input
              id="placeholder"
              value={placeholder}
              onChange={(e) => setPlaceholder(e.target.value)}
              placeholder="Texto de exemplo"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="helpText">Texto de ajuda (opcional)</Label>
            <Textarea
              id="helpText"
              value={helpText}
              onChange={(e) => setHelpText(e.target.value)}
              placeholder="Instruções adicionais"
              rows={2}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="required">Campo obrigatório</Label>
            <Switch
              id="required"
              checked={required}
              onCheckedChange={setRequired}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!label.trim()}>
            {field ? 'Guardar' : 'Adicionar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
