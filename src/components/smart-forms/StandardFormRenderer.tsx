import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Check, Loader2, Sparkles } from 'lucide-react';
import { SmartFormField, SmartFormSchema } from '@/types/smartForm';
import { cn } from '@/lib/utils';

interface StandardFormRendererProps {
  schema: SmartFormSchema;
  formName: string;
  formDescription?: string;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  isSubmitting?: boolean;
}

export function StandardFormRenderer({
  schema,
  formName,
  formDescription,
  onSubmit,
  isSubmitting = false,
}: StandardFormRendererProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isComplete, setIsComplete] = useState(false);
  const [showEnrichmentHint, setShowEnrichmentHint] = useState(false);

  const fields = schema.fields;

  const handleFieldChange = (fieldId: string, value: unknown, field: SmartFormField) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
    
    // Clear error
    if (errors[fieldId]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }

    // Show enrichment hint for enrichable fields
    if (field.enrichmentSource && value) {
      setShowEnrichmentHint(true);
      setTimeout(() => setShowEnrichmentHint(false), 3000);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    for (const field of fields) {
      if (field.required) {
        const value = formData[field.id];
        if (!value || (typeof value === 'string' && !value.trim())) {
          newErrors[field.id] = 'Este campo é obrigatório';
        }
      }

      // Email validation
      if (field.type === 'email' && formData[field.id]) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(String(formData[field.id]))) {
          newErrors[field.id] = 'Email inválido';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      await onSubmit(formData);
      setIsComplete(true);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const renderField = (field: SmartFormField) => {
    const value = formData[field.id];
    const error = errors[field.id];

    const commonProps = {
      id: field.id,
      className: cn(error && 'border-destructive'),
    };

    switch (field.type) {
      case 'textarea':
        return (
          <Textarea
            {...commonProps}
            value={String(value || '')}
            onChange={(e) => handleFieldChange(field.id, e.target.value, field)}
            placeholder={field.placeholder}
            className={cn('resize-none min-h-[100px]', error && 'border-destructive')}
          />
        );

      case 'select':
        return (
          <Select
            value={String(value || '')}
            onValueChange={(v) => handleFieldChange(field.id, v, field)}
          >
            <SelectTrigger className={cn(error && 'border-destructive')}>
              <SelectValue placeholder={field.placeholder || 'Seleciona uma opção'} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'multiselect':
        const selectedValues = Array.isArray(value) ? value : [];
        return (
          <div className="space-y-2">
            {field.options?.map(opt => (
              <div key={opt.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`${field.id}-${opt.value}`}
                  checked={selectedValues.includes(opt.value)}
                  onCheckedChange={(checked) => {
                    const newValues = checked
                      ? [...selectedValues, opt.value]
                      : selectedValues.filter((v: string) => v !== opt.value);
                    handleFieldChange(field.id, newValues, field);
                  }}
                />
                <Label htmlFor={`${field.id}-${opt.value}`}>{opt.label}</Label>
              </div>
            ))}
          </div>
        );

      case 'boolean':
        return (
          <Switch
            checked={Boolean(value)}
            onCheckedChange={(v) => handleFieldChange(field.id, v, field)}
          />
        );

      case 'number':
        return (
          <Input
            {...commonProps}
            type="number"
            value={String(value || '')}
            onChange={(e) => handleFieldChange(field.id, e.target.value ? Number(e.target.value) : '', field)}
            placeholder={field.placeholder}
          />
        );

      case 'currency':
        return (
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
            <Input
              {...commonProps}
              type="number"
              value={String(value || '')}
              onChange={(e) => handleFieldChange(field.id, e.target.value ? Number(e.target.value) : '', field)}
              placeholder={field.placeholder}
              className={cn('pl-7', error && 'border-destructive')}
            />
          </div>
        );

      case 'date':
        return (
          <Input
            {...commonProps}
            type="date"
            value={String(value || '')}
            onChange={(e) => handleFieldChange(field.id, e.target.value, field)}
          />
        );

      case 'datetime':
        return (
          <Input
            {...commonProps}
            type="datetime-local"
            value={String(value || '')}
            onChange={(e) => handleFieldChange(field.id, e.target.value, field)}
          />
        );

      default:
        return (
          <Input
            {...commonProps}
            type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : field.type === 'url' ? 'url' : 'text'}
            value={String(value || '')}
            onChange={(e) => handleFieldChange(field.id, e.target.value, field)}
            placeholder={field.placeholder}
          />
        );
    }
  };

  if (isComplete) {
    return (
      <Card className="max-w-lg mx-auto">
        <CardContent className="py-12 text-center">
          <div className="rounded-full bg-primary/10 p-4 w-fit mx-auto mb-4">
            <Check className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-semibold mb-2">{schema.settings.successMessage}</h2>
          <p className="text-muted-foreground">
            Vamos analisar a tua resposta e entrar em contacto em breve.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>{formName}</CardTitle>
        {formDescription && <CardDescription>{formDescription}</CardDescription>}
      </CardHeader>
      <CardContent>
        {/* Enrichment Hint */}
        {showEnrichmentHint && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4 p-3 rounded-lg bg-primary/5 animate-fade-in">
            <Sparkles className="h-4 w-4 text-primary animate-pulse" />
            <span>Estamos a completar alguns dados automaticamente para poupar tempo.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {fields.map((field) => (
            <div key={field.id} className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor={field.id}>
                  {field.label}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </Label>
                {field.enrichmentSource && (
                  <Badge variant="outline" className="text-xs gap-1">
                    <Sparkles className="h-3 w-3" />
                    Auto
                  </Badge>
                )}
              </div>
              
              {renderField(field)}
              
              {field.helpText && (
                <p className="text-sm text-muted-foreground">{field.helpText}</p>
              )}
              
              {errors[field.id] && (
                <p className="text-sm text-destructive">{errors[field.id]}</p>
              )}
            </div>
          ))}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                A enviar...
              </>
            ) : (
              schema.settings.submitButtonText
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
