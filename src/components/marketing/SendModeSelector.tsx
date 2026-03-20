import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Clock, Zap, Timer, Brain } from 'lucide-react';

interface Props {
  sendMode: string;
  batchSize: number;
  batchIntervalMinutes: number;
  recipientCount: number;
  onModeChange: (mode: string) => void;
  onBatchSizeChange: (size: number) => void;
  onBatchIntervalChange: (minutes: number) => void;
}

export function SendModeSelector({
  sendMode,
  batchSize,
  batchIntervalMinutes,
  recipientCount,
  onModeChange,
  onBatchSizeChange,
  onBatchIntervalChange,
}: Props) {
  const totalBatches = Math.ceil(recipientCount / batchSize);
  const estimatedMinutes = (totalBatches - 1) * batchIntervalMinutes;
  const estimatedHours = Math.floor(estimatedMinutes / 60);
  const remainingMinutes = estimatedMinutes % 60;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          Modo de Envio
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup value={sendMode} onValueChange={onModeChange} className="space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
            <RadioGroupItem value="immediate" id="immediate" className="mt-0.5" />
            <div className="flex-1">
              <Label htmlFor="immediate" className="flex items-center gap-2 cursor-pointer font-medium">
                <Zap className="h-4 w-4 text-amber-500" />
                Imediato
              </Label>
              <p className="text-xs text-muted-foreground mt-1">Enviar todos de uma vez</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
            <RadioGroupItem value="throttled" id="throttled" className="mt-0.5" />
            <div className="flex-1">
              <Label htmlFor="throttled" className="flex items-center gap-2 cursor-pointer font-medium">
                <Timer className="h-4 w-4 text-blue-500" />
                Por lotes
              </Label>
              <p className="text-xs text-muted-foreground mt-1">Distribuir envios ao longo do tempo</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg border opacity-60">
            <RadioGroupItem value="optimal_time" id="optimal_time" className="mt-0.5" disabled />
            <div className="flex-1">
              <Label htmlFor="optimal_time" className="flex items-center gap-2 cursor-not-allowed font-medium">
                <Brain className="h-4 w-4 text-purple-500" />
                Horário ideal por contacto (IA)
                <Badge variant="outline" className="text-[10px] ml-1">Em breve</Badge>
              </Label>
              <p className="text-xs text-muted-foreground mt-1">Baseado no histórico de aberturas</p>
            </div>
          </div>
        </RadioGroup>

        {sendMode === 'throttled' && (
          <div className="space-y-4 pt-2 border-t">
            <div className="space-y-2">
              <Label className="text-sm">Tamanho do lote: {batchSize}</Label>
              <Slider
                value={[batchSize]}
                onValueChange={([v]) => onBatchSizeChange(v)}
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
              <Label className="text-sm">Intervalo entre lotes</Label>
              <Select value={String(batchIntervalMinutes)} onValueChange={(v) => onBatchIntervalChange(Number(v))}>
                <SelectTrigger>
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

            <div className="p-3 bg-muted/50 rounded-lg text-sm">
              <p className="font-medium">Estimativa de envio</p>
              <p className="text-muted-foreground text-xs mt-1">
                {totalBatches} lotes × {batchSize} emails = {recipientCount} destinatários
              </p>
              <p className="text-muted-foreground text-xs">
                Envio completo em ~{estimatedHours > 0 ? `${estimatedHours}h ` : ''}{remainingMinutes}min
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
