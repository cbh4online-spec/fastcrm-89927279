import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, CheckCircle2, ArrowRight, AlertTriangle } from 'lucide-react';
import { SmartForm } from '@/types/smartForm';
import { AIActionButton } from '@/components/saas/AIActionButton';

interface AIFormOptimizerProps {
  form: SmartForm;
}

interface Suggestion {
  type: 'remove' | 'reorder' | 'optional' | 'label' | 'add';
  field?: string;
  reason: string;
  impact: string;
}

export function AIFormOptimizer({ form }: AIFormOptimizerProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);

  const handleOptimize = async () => {
    setIsAnalyzing(true);
    
    // Simulate AI analysis based on form structure
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const fields = form.schema?.fields || [];
    const generated: Suggestion[] = [];

    // Analyze field count
    if (fields.length > 6) {
      const optionalFields = fields.filter(f => !f.required);
      if (optionalFields.length > 0) {
        generated.push({
          type: 'remove',
          field: optionalFields[optionalFields.length - 1]?.label,
          reason: `${fields.length} campos é superior à média ideal (4-5). Formulários mais curtos convertem melhor.`,
          impact: '+15-25% conversão estimada',
        });
      }
    }

    // Check for potential reorders
    const emailField = fields.findIndex(f => f.type === 'email');
    if (emailField > 1) {
      generated.push({
        type: 'reorder',
        field: 'Email',
        reason: 'O campo de email deveria estar entre os 2 primeiros — capta o contacto mesmo que o utilizador abandone.',
        impact: '+10% leads parciais captados',
      });
    }

    // Check textarea fields
    const textareas = fields.filter(f => f.type === 'textarea');
    if (textareas.length > 0 && textareas.some(f => f.required)) {
      generated.push({
        type: 'optional',
        field: textareas[0].label,
        reason: 'Campos de texto livre obrigatórios são a principal causa de abandono. Torna-o opcional.',
        impact: '+20% taxa de conclusão',
      });
    }

    // Suggest adding if no phone
    if (!fields.some(f => f.type === 'phone') && form.form_type === 'lead_capture') {
      generated.push({
        type: 'add',
        field: 'Telefone (opcional)',
        reason: 'Leads com telefone têm 3x mais probabilidade de converter. Adiciona como campo opcional.',
        impact: '+30% qualidade dos leads',
      });
    }

    if (generated.length === 0) {
      generated.push({
        type: 'label',
        reason: 'O formulário parece bem otimizado! Sem sugestões significativas de melhoria.',
        impact: 'Mantém a estrutura atual',
      });
    }

    setSuggestions(generated);
    setIsAnalyzing(false);
  };

  const getTypeIcon = (type: Suggestion['type']) => {
    switch (type) {
      case 'remove': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'reorder': return <ArrowRight className="h-4 w-4 text-blue-500" />;
      case 'optional': return <CheckCircle2 className="h-4 w-4 text-amber-500" />;
      case 'add': return <Sparkles className="h-4 w-4 text-green-500" />;
      default: return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    }
  };

  const getTypeLabel = (type: Suggestion['type']) => {
    switch (type) {
      case 'remove': return 'Remover';
      case 'reorder': return 'Reordenar';
      case 'optional': return 'Tornar Opcional';
      case 'add': return 'Adicionar';
      default: return 'Sugestão';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Otimizador IA
            </CardTitle>
            <CardDescription>Analisa o formulário e sugere melhorias de conversão</CardDescription>
          </div>
          <AIActionButton
            tier="light"
            onConfirm={handleOptimize}
            disabled={isAnalyzing}
            size="sm"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                A analisar...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-1" />
                Otimizar
              </>
            )}
          </AIActionButton>
        </div>
      </CardHeader>
      {suggestions && (
        <CardContent>
          <div className="space-y-3">
            {suggestions.map((suggestion, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                {getTypeIcon(suggestion.type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Badge variant="outline" className="text-xs">{getTypeLabel(suggestion.type)}</Badge>
                    {suggestion.field && (
                      <span className="text-xs font-medium text-muted-foreground">"{suggestion.field}"</span>
                    )}
                  </div>
                  <p className="text-sm">{suggestion.reason}</p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1 font-medium">{suggestion.impact}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
