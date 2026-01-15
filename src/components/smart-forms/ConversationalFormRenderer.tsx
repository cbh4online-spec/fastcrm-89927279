import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ArrowRight, Check, Loader2, Sparkles } from 'lucide-react';
import { SmartFormField, SmartFormSchema } from '@/types/smartForm';
import { cn } from '@/lib/utils';

interface ConversationalFormRendererProps {
  schema: SmartFormSchema;
  formName: string;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  isSubmitting?: boolean;
}

interface Message {
  type: 'question' | 'answer';
  content: string;
  field?: SmartFormField;
}

export function ConversationalFormRenderer({
  schema,
  formName,
  onSubmit,
  isSubmitting = false,
}: ConversationalFormRendererProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentValue, setCurrentValue] = useState<string>('');
  const [isComplete, setIsComplete] = useState(false);
  const [showEnrichmentHint, setShowEnrichmentHint] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fields = schema.fields;
  const progress = fields.length > 0 ? ((currentStep + 1) / fields.length) * 100 : 0;
  const currentField = fields[currentStep];

  useEffect(() => {
    // Add initial greeting
    if (messages.length === 0 && fields.length > 0) {
      const greeting: Message = {
        type: 'question',
        content: fields[0].conversationalPrompt || `Olá! Vamos começar. ${fields[0].label}?`,
        field: fields[0],
      };
      setMessages([greeting]);
    }
  }, [fields, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleNext = async () => {
    if (!currentField) return;

    // Validate required fields
    if (currentField.required && !currentValue.trim()) {
      return;
    }

    // Save answer
    const newFormData = { ...formData, [currentField.id]: currentValue };
    setFormData(newFormData);

    // Add answer message
    const answerMessage: Message = {
      type: 'answer',
      content: currentValue || '(sem resposta)',
    };
    setMessages(prev => [...prev, answerMessage]);

    // Check for enrichment
    if (currentField.enrichmentSource) {
      setShowEnrichmentHint(true);
      setTimeout(() => setShowEnrichmentHint(false), 3000);
    }

    // Move to next step or complete
    if (currentStep < fields.length - 1) {
      const nextField = fields[currentStep + 1];
      const nextQuestion: Message = {
        type: 'question',
        content: nextField.conversationalPrompt || nextField.label,
        field: nextField,
      };
      
      setTimeout(() => {
        setMessages(prev => [...prev, nextQuestion]);
        setCurrentStep(currentStep + 1);
        setCurrentValue('');
      }, 300);
    } else {
      // Submit form
      setIsComplete(true);
      await onSubmit(newFormData);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && currentField?.type !== 'textarea') {
      e.preventDefault();
      handleNext();
    }
  };

  const renderInput = () => {
    if (!currentField) return null;

    switch (currentField.type) {
      case 'textarea':
        return (
          <Textarea
            value={currentValue}
            onChange={(e) => setCurrentValue(e.target.value)}
            placeholder={currentField.placeholder || 'Escreve aqui...'}
            className="min-h-[100px] resize-none"
            autoFocus
          />
        );

      case 'select':
        return (
          <Select value={currentValue} onValueChange={setCurrentValue}>
            <SelectTrigger>
              <SelectValue placeholder="Seleciona uma opção" />
            </SelectTrigger>
            <SelectContent>
              {currentField.options?.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'multiselect':
        const selectedValues = currentValue ? currentValue.split(',') : [];
        return (
          <div className="space-y-2">
            {currentField.options?.map(opt => (
              <div key={opt.value} className="flex items-center space-x-2">
                <Checkbox
                  id={opt.value}
                  checked={selectedValues.includes(opt.value)}
                  onCheckedChange={(checked) => {
                    const newValues = checked
                      ? [...selectedValues, opt.value]
                      : selectedValues.filter(v => v !== opt.value);
                    setCurrentValue(newValues.join(','));
                  }}
                />
                <Label htmlFor={opt.value}>{opt.label}</Label>
              </div>
            ))}
          </div>
        );

      case 'boolean':
        return (
          <RadioGroup value={currentValue} onValueChange={setCurrentValue}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="true" id="yes" />
              <Label htmlFor="yes">Sim</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="false" id="no" />
              <Label htmlFor="no">Não</Label>
            </div>
          </RadioGroup>
        );

      case 'number':
      case 'currency':
        return (
          <Input
            type="number"
            value={currentValue}
            onChange={(e) => setCurrentValue(e.target.value)}
            placeholder={currentField.placeholder}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        );

      case 'date':
        return (
          <Input
            type="date"
            value={currentValue}
            onChange={(e) => setCurrentValue(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        );

      default:
        return (
          <Input
            type={currentField.type === 'email' ? 'email' : currentField.type === 'phone' ? 'tel' : currentField.type === 'url' ? 'url' : 'text'}
            value={currentValue}
            onChange={(e) => setCurrentValue(e.target.value)}
            placeholder={currentField.placeholder}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        );
    }
  };

  if (isComplete) {
    return (
      <div className="max-w-lg mx-auto py-12 text-center">
        <div className="rounded-full bg-primary/10 p-4 w-fit mx-auto mb-4">
          <Check className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold mb-2">{schema.settings.successMessage}</h2>
        <p className="text-muted-foreground">
          Vamos analisar a tua resposta e entrar em contacto em breve.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Progress */}
      {schema.settings.showProgressBar && (
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">{formName}</span>
            <span className="text-muted-foreground">{currentStep + 1} de {fields.length}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {/* Messages */}
      <div className="space-y-4 mb-6">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={cn(
              "flex",
              msg.type === 'answer' ? 'justify-end' : 'justify-start'
            )}
          >
            <Card className={cn(
              "max-w-[85%]",
              msg.type === 'answer' ? 'bg-primary text-primary-foreground' : 'bg-muted'
            )}>
              <CardContent className="p-3">
                <p>{msg.content}</p>
                {msg.field?.helpText && msg.type === 'question' && (
                  <p className="text-sm mt-1 opacity-70">{msg.field.helpText}</p>
                )}
              </CardContent>
            </Card>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Enrichment Hint */}
      {showEnrichmentHint && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4 animate-fade-in">
          <Sparkles className="h-4 w-4 text-primary animate-pulse" />
          <span>Estamos a completar alguns dados automaticamente para poupar tempo.</span>
        </div>
      )}

      {/* Current Input */}
      {currentField && (
        <div className="space-y-4">
          {renderInput()}
          
          <div className="flex items-center justify-between">
            {currentField.required && (
              <Badge variant="secondary" className="text-xs">Obrigatório</Badge>
            )}
            <Button 
              onClick={handleNext} 
              disabled={isSubmitting || (currentField.required && !currentValue.trim())}
              className="ml-auto gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  A enviar...
                </>
              ) : currentStep === fields.length - 1 ? (
                <>
                  {schema.settings.submitButtonText}
                  <Check className="h-4 w-4" />
                </>
              ) : (
                <>
                  Continuar
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
