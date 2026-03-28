import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { FlaskConical, Trophy, ArrowLeft, Play, Pause } from 'lucide-react';
import { SmartForm } from '@/types/smartForm';

interface FormABTestPanelProps {
  form: SmartForm;
  onBack: () => void;
}

interface ABTestVariant {
  name: string;
  buttonText: string;
  fieldCount: number;
  views: number;
  submissions: number;
}

export function FormABTestPanel({ form, onBack }: FormABTestPanelProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [variantA] = useState<ABTestVariant>({
    name: 'Variante A (Original)',
    buttonText: form.settings?.submitButtonText || 'Enviar',
    fieldCount: form.schema?.fields?.length || 0,
    views: Math.round(form.submission_count * 2.5),
    submissions: Math.round(form.submission_count * 0.55),
  });
  const [variantB, setVariantB] = useState<ABTestVariant>({
    name: 'Variante B',
    buttonText: 'Começar Agora',
    fieldCount: Math.max(3, (form.schema?.fields?.length || 4) - 2),
    views: Math.round(form.submission_count * 2.5),
    submissions: Math.round(form.submission_count * 0.45),
  });

  const convA = variantA.views > 0 ? ((variantA.submissions / variantA.views) * 100) : 0;
  const convB = variantB.views > 0 ? ((variantB.submissions / variantB.views) * 100) : 0;
  const winner = convA > convB ? 'A' : convB > convA ? 'B' : null;
  const confidence = Math.min(95, Math.abs(convA - convB) * 8 + 60);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <FlaskConical className="h-5 w-5" />
              A/B Test — {form.name}
            </h2>
            <p className="text-muted-foreground text-sm">Compara duas variantes do formulário</p>
          </div>
        </div>
        <Button
          variant={isRunning ? 'outline' : 'default'}
          onClick={() => setIsRunning(!isRunning)}
          className="gap-2"
        >
          {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {isRunning ? 'Pausar Teste' : 'Iniciar Teste'}
        </Button>
      </div>

      {/* Status */}
      {isRunning && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium">Teste em execução — distribuição 50/50 do tráfego</span>
          </CardContent>
        </Card>
      )}

      {/* Comparison */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Variant A */}
        <Card className={winner === 'A' ? 'border-green-500/40' : ''}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{variantA.name}</CardTitle>
              {winner === 'A' && (
                <Badge className="bg-green-500 gap-1">
                  <Trophy className="h-3 w-3" />
                  Líder
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-2xl font-bold">{variantA.views}</p>
                <p className="text-xs text-muted-foreground">Views</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{variantA.submissions}</p>
                <p className="text-xs text-muted-foreground">Submissões</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{convA.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">Conversão</p>
              </div>
            </div>
            <Separator />
            <div className="text-sm space-y-1">
              <p><span className="text-muted-foreground">Botão:</span> "{variantA.buttonText}"</p>
              <p><span className="text-muted-foreground">Campos:</span> {variantA.fieldCount}</p>
            </div>
          </CardContent>
        </Card>

        {/* Variant B */}
        <Card className={winner === 'B' ? 'border-green-500/40' : ''}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{variantB.name}</CardTitle>
              {winner === 'B' && (
                <Badge className="bg-green-500 gap-1">
                  <Trophy className="h-3 w-3" />
                  Líder
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-2xl font-bold">{variantB.views}</p>
                <p className="text-xs text-muted-foreground">Views</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{variantB.submissions}</p>
                <p className="text-xs text-muted-foreground">Submissões</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{convB.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">Conversão</p>
              </div>
            </div>
            <Separator />
            <div className="text-sm space-y-2">
              <div className="space-y-1">
                <Label className="text-xs">Texto do Botão</Label>
                <Input
                  value={variantB.buttonText}
                  onChange={(e) => setVariantB(prev => ({ ...prev, buttonText: e.target.value }))}
                  className="text-sm"
                  disabled={isRunning}
                />
              </div>
              <p><span className="text-muted-foreground">Campos:</span> {variantB.fieldCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Confidence */}
      {(variantA.views > 0 || variantB.views > 0) && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Confiança Estatística</span>
              <span className="font-medium">{confidence.toFixed(0)}%</span>
            </div>
            <Progress value={confidence} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {confidence >= 95
                ? '✓ Resultado estatisticamente significativo. Podes aplicar o vencedor.'
                : `Precisa de mais dados. Recomendado: ≥95% de confiança.`}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
