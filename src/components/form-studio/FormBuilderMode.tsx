import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FormField, FIELD_TYPE_LABELS } from '@/types/formSchema';
import { FormFieldEditor } from './FormFieldEditor';
import {
  Plus,
  GripVertical,
  Pencil,
  Trash2,
  Type,
  AlignLeft,
  Hash,
  DollarSign,
  Calendar,
  Clock,
  ToggleLeft,
  ChevronDown,
  CheckSquare,
  Mail,
  Phone,
  Link,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FormBuilderModeProps {
  fields: FormField[];
  onFieldsChange: (fields: FormField[]) => void;
}

const FIELD_ICONS: Record<string, React.ElementType> = {
  text: Type,
  textarea: AlignLeft,
  number: Hash,
  currency: DollarSign,
  date: Calendar,
  datetime: Clock,
  boolean: ToggleLeft,
  select: ChevronDown,
  multiselect: CheckSquare,
  email: Mail,
  phone: Phone,
  url: Link,
};

export function FormBuilderMode({ fields, onFieldsChange }: FormBuilderModeProps) {
  const [editingField, setEditingField] = useState<FormField | undefined>();
  const [editorOpen, setEditorOpen] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleAddField = () => {
    setEditingField(undefined);
    setEditorOpen(true);
  };

  const handleEditField = (field: FormField) => {
    setEditingField(field);
    setEditorOpen(true);
  };

  const handleSaveField = (field: FormField) => {
    if (editingField) {
      onFieldsChange(fields.map((f) => (f.id === field.id ? field : f)));
    } else {
      onFieldsChange([...fields, field]);
    }
  };

  const handleDeleteField = (id: string) => {
    onFieldsChange(fields.filter((f) => f.id !== id));
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newFields = [...fields];
    const [removed] = newFields.splice(draggedIndex, 1);
    newFields.splice(index, 0, removed);
    onFieldsChange(newFields);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Arraste para reordenar os campos
        </p>
        <Button onClick={handleAddField}>
          <Plus className="h-4 w-4 mr-2" /> Adicionar campo
        </Button>
      </div>

      {fields.length === 0 ? (
        <Card className="p-8 text-center border-dashed">
          <p className="text-muted-foreground mb-4">
            Nenhum campo adicionado ainda
          </p>
          <Button variant="outline" onClick={handleAddField}>
            <Plus className="h-4 w-4 mr-2" /> Adicionar primeiro campo
          </Button>
        </Card>
      ) : (
        <div className="space-y-2">
          {fields.map((field, index) => {
            const Icon = FIELD_ICONS[field.type] || Type;
            return (
              <Card
                key={field.id}
                className={cn(
                  'p-3 flex items-center gap-3 cursor-move transition-opacity',
                  draggedIndex === index && 'opacity-50'
                )}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                
                <div className="h-8 w-8 rounded bg-muted flex items-center justify-center flex-shrink-0">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{field.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {FIELD_TYPE_LABELS[field.type]}
                    {field.required && ' • Obrigatório'}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEditField(field)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteField(field.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <FormFieldEditor
        field={editingField}
        open={editorOpen}
        onOpenChange={setEditorOpen}
        onSave={handleSaveField}
      />
    </div>
  );
}
