import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { FlaskConical, Trophy, Info } from 'lucide-react';
import { useCampaignAbTest } from '@/hooks/useCampaignAbTest';

interface Props {
  campaignId: string;
  currentSubject: string;
  recipientCount: number;
}

export function AbTestPanel({ campaignId, currentSubject, recipientCount }: Props) {
  const { abTest, createAbTest, getAbTestResults, winner, isCompleted, isLoading } = useCampaignAbTest(campaignId);
  const [enabled, setEnabled] = useState(!!abTest);
  const [variantB, setVariantB] = useState(abTest?.variant_b_subject || '');
  const [testPercentage, setTestPercentage] = useState(abTest?.test_percentage || 20);
  const [waitHours, setWaitHours] = useState(abTest?.wait_hours || 4);
  const [winnerMetric, setWinnerMetric] = useState(abTest?.winner_metric || 'open_rate');

  const minRecipients = 100;
  const canEnable = recipientCount >= minRecipients;
  const testSize = Math.floor(recipientCount * (testPercentage / 100) / 2);

  const handleSave = () => {
    createAbTest.mutate({
      variant_a_subject: currentSubject,
      variant_b_subject: variantB,
      test_percentage: testPercentage,
      wait_hours: waitHours,
      winner_metric: winnerMetric,
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-primary" />
          Teste A/B
          {abTest?.status === 'testing' && <Badge variant="outline" className="bg-amber-50 text-amber-700">A decorrer</Badge>}
          {isCompleted && <Badge variant="outline" className="bg-emerald-50 text-emerald-700">Concluído</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!canEnable ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Info className="h-4 w-4" />
                Mínimo de {minRecipients} destinatários para teste A/B
              </div>
            </TooltipTrigger>
            <TooltipContent>
              Necessita de pelo menos {minRecipients} destinatários para resultados estatisticamente relevantes.
            </TooltipContent>
          </Tooltip>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <Label htmlFor="ab-toggle">Testar variação de assunto</Label>
              <Switch id="ab-toggle" checked={enabled} onCheckedChange={setEnabled} disabled={!!abTest} />
            </div>

            {enabled && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Assunto A</Label>
                  <Input value={currentSubject} disabled className="bg-muted/50" />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Assunto B</Label>
                  <Input
                    value={variantB}
                    onChange={(e) => setVariantB(e.target.value)}
                    placeholder="Versão alternativa do assunto..."
                    disabled={!!abTest}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Tamanho do teste: {testPercentage}%</Label>
                  <Slider
                    value={[testPercentage]}
                    onValueChange={([v]) => setTestPercentage(v)}
                    min={10}
                    max={40}
                    step={5}
                    disabled={!!abTest}
                  />
                  <p className="text-xs text-muted-foreground">
                    {testSize} contactos receberão cada variante
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm">Aguardar</Label>
                    <Select value={String(waitHours)} onValueChange={(v) => setWaitHours(Number(v))} disabled={!!abTest}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2 horas</SelectItem>
                        <SelectItem value="4">4 horas</SelectItem>
                        <SelectItem value="8">8 horas</SelectItem>
                        <SelectItem value="24">24 horas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Métrica vencedora</Label>
                    <Select value={winnerMetric} onValueChange={setWinnerMetric} disabled={!!abTest}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open_rate">Taxa de abertura</SelectItem>
                        <SelectItem value="click_rate">Taxa de cliques</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {!abTest && (
                  <Button onClick={handleSave} disabled={!variantB || createAbTest.isPending} className="w-full">
                    Configurar Teste A/B
                  </Button>
                )}

                {isCompleted && winner && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-emerald-600" />
                      <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                        Vencedor: Assunto {winner.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-1">
                      Restantes enviados com o assunto vencedor
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
