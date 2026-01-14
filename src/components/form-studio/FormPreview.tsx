import { FormField, FormSchema } from '@/types/formSchema';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface FormPreviewProps {
  title: string;
  description?: string;
  fields: FormField[];
  submitButtonText?: string;
}

export function FormPreview({
  title,
  description,
  fields,
  submitButtonText = 'Enviar',
}: FormPreviewProps) {
  const renderField = (field: FormField) => {
    const commonProps = {
      id: field.id,
      placeholder: field.placeholder,
      required: field.required,
      disabled: true,
    };

    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
      case 'url':
        return <Input {...commonProps} type={field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : 'text'} />;

      case 'textarea':
        return <Textarea {...commonProps} rows={3} />;

      case 'number':
        return <Input {...commonProps} type="number" />;

      case 'currency':
        return (
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
            <Input {...commonProps} type="number" step="0.01" className="pl-7" />
          </div>
        );

      case 'date':
        return <Input {...commonProps} type="date" />;

      case 'datetime':
        return <Input {...commonProps} type="datetime-local" />;

      case 'boolean':
        return (
          <div className="flex items-center gap-2">
            <Switch id={field.id} disabled />
            <Label htmlFor={field.id} className="text-sm text-muted-foreground">
              {field.placeholder || 'Sim / Não'}
            </Label>
          </div>
        );

      case 'select':
        return (
          <Select disabled>
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder || 'Selecionar...'} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'multiselect':
        return (
          <div className="space-y-2 border rounded-md p-3">
            {field.options?.map((option) => (
              <div key={option.value} className="flex items-center gap-2">
                <Checkbox id={`${field.id}-${option.value}`} disabled />
                <Label htmlFor={`${field.id}-${option.value}`} className="text-sm">
                  {option.label}
                </Label>
              </div>
            )) || (
              <p className="text-sm text-muted-foreground">Sem opções definidas</p>
            )}
          </div>
        );

      default:
        return <Input {...commonProps} />;
    }
  };

  if (fields.length === 0) {
    return (
      <Card className="p-8 text-center border-dashed">
        <p className="text-muted-foreground">
          Adicione campos para ver a pré-visualização
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="space-y-2">
          <h3 className="text-xl font-semibold">{title || 'Título do formulário'}</h3>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>

        <div className="space-y-4">
          {fields.map((field) => (
            <div key={field.id} className="space-y-2">
              <Label htmlFor={field.id}>
                {field.label}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </Label>
              {renderField(field)}
              {field.helpText && (
                <p className="text-xs text-muted-foreground">{field.helpText}</p>
              )}
            </div>
          ))}
        </div>

        <Button disabled className="w-full">
          {submitButtonText}
        </Button>
      </div>
    </Card>
  );
}
