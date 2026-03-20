import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Clock, Zap, Timer, Brain, AlertTriangle } from 'lucide-react';

interface CampaignSendModeSelectorProps {
  campaignId: string;
  value: string;
  batchSize?: number;
  batchIntervalMinutes?: number;
  recipientCount?: number;
  onChange: (mode: string, config: { batch_size?: number; batch_interval_minutes?: number }) => void;
}

export function CampaignSendModeSelector({
  value,
  batchSize = 100,
  batchIntervalMinutes = 60,
  recipientCount = 0,
  onChange,
}: CampaignSendModeSelectorProps) {
  const totalBatches = Math.ceil(recipientCount / batchSize);
  const estimatedMinutes = (totalBatches - 1) * batchIntervalMinutes;
  const estimatedHours = (estimatedMinutes / 60).toFixed(1);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          Modo de Envio
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup
          value={value}
          onValueChange={(mode) =>
            onChange(mode, {
              batch_size: batchSize,
              batch_interval_minutes: batchIntervalMinutes,
            })
          }
          className="space-y-3"
        >
          {/* Imediato */}
          <label
            htmlFor="mode-immediate"
            className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
              value === 'immediate' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
            }`}
          >
            <RadioGroupItem value="immediate" id="mode-immediate" className="mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center gap-2 font-medium text-sm">
                <Zap className="h-4 w-4 text-amber-500" />
                Imediato
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Envia para todos os destinatários de uma vez
              </p>
            </div>
          </label>

          {/* Por lotes */}
          <div
            className={`rounded-lg border transition-colors ${
              value === 'throttled' ? 'border-primary bg-primary/5' : ''
            }`}
          >
            <label
              htmlFor="mode-throttled"
              className={`flex items-start gap-3 p-3 cursor-pointer ${
                value !== 'throttled' ? 'hover:bg-muted/50 rounded-lg' : ''
              }`}
            >
              <RadioGroupItem value="throttled" id="mode-throttled" className="mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center gap-2 font-medium text-sm">
                  <Timer className="h-4 w-4 text-blue-500" />
                  Por lotes
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Distribui o envio ao longo do tempo
                </p>
              </div>
            </label>

            {value === 'throttled' && (
              <div className="px-3 pb-3 space-y-4 border-t pt-3 mx-3">
                <div className="space-y-2">
                  <Label className="text-xs">
                    Tamanho do lote: <span className="font-semibold">{batchSize} emails</span>
                  </Label>
                  <Slider
                    value={[batchSize]}
                    onValueChange={([v]) =>
                      onChange('throttled', {
                        batch_size: v,
                        batch_interval_minutes: batchIntervalMinutes,
                      })
                    }
                    min={50}
                    max={500}
                    step={50}
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>50</span>
                    <span>500</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Intervalo entre lotes</Label>
                  <Select
                    value={String(batchIntervalMinutes)}
                    onValueChange={(v) =>
                      onChange('throttled', {
                        batch_size: batchSize,
                        batch_interval_minutes: Number(v),
                      })
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutos</SelectItem>
                      <SelectItem value="30">30 minutos</SelectItem>
                      <SelectItem value="60">1 hora</SelectItem>
                      <SelectItem value="120">2 horas</SelectItem>
                      <SelectItem value="240">4 horas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {recipientCount > 0 && (
                  <div className="flex items-start gap-2 rounded-md bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Estimativa: {totalBatches} lotes</p>
                      <p>
                        Envio completo em ~
                        {estimatedMinutes < 60
                          ? `${estimatedMinutes} minutos`
                          : `${estimatedHours} horas`}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Horário ideal — disabled */}
          <label
            htmlFor="mode-optimal"
            className="flex items-start gap-3 rounded-lg border p-3 opacity-50 cursor-not-allowed"
          >
            <RadioGroupItem value="optimal_time" id="mode-optimal" className="mt-0.5" disabled />
            <div className="flex-1">
              <div className="flex items-center gap-2 font-medium text-sm">
                <Brain className="h-4 w-4 text-violet-500" />
                Horário ideal por contacto
                <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                  Brevemente
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                IA agenda o envio quando cada contacto tem maior probabilidade de abrir
              </p>
            </div>
          </label>
        </RadioGroup>
      </CardContent>
    </Card>
  );
}
