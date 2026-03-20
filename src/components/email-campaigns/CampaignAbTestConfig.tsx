import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCampaignAbTest } from '@/hooks/useCampaignAbTest';
import {
  FlaskConical,
  Trophy,
  Loader2,
  Clock,
  BarChart3,
  MousePointerClick,
} from 'lucide-react';

interface Props {
  campaignId: string;
  currentSubject: string;
  totalRecipients: number;
}

export function CampaignAbTestConfig({ campaignId, currentSubject, totalRecipients }: Props) {
  const {
    abTest,
    isLoading,
    createAbTest,
    deleteAbTest,
    openRateA,
    openRateB,
    isCompleted,
    winner,
    timeRemaining,
  } = useCampaignAbTest(campaignId);

  const [enabled, setEnabled] = useState(false);
  const [subjectA, setSubjectA] = useState(currentSubject);
  const [subjectB, setSubjectB] = useState('');
  const [testPct, setTestPct] = useState(20);
  const [waitHours, setWaitHours] = useState(4);
  const [metric, setMetric] = useState<'open_rate' | 'click_rate'>('open_rate');

  useEffect(() => {
    if (abTest) {
      setEnabled(true);
      setSubjectA(abTest.variant_a_subject);
      setSubjectB(abTest.variant_b_subject);
      setTestPct(abTest.test_percentage ?? 20);
      setWaitHours(abTest.wait_hours ?? 4);
      setMetric((abTest.winner_metric as 'open_rate' | 'click_rate') ?? 'open_rate');
    }
  }, [abTest]);

  const recipientsPerVariant = Math.floor((totalRecipients * testPct) / 100 / 2);
  const tooFewRecipients = totalRecipients < 100;

  const handleSave = async () => {
    await createAbTest.mutateAsync({
      variant_a_subject: subjectA,
      variant_b_subject: subjectB,
      test_percentage: testPct,
      wait_hours: waitHours,
      winner_metric: metric,
    });
  };

  const handleToggle = (checked: boolean) => {
    setEnabled(checked);
    if (!checked && abTest && abTest.status === 'pending') {
      deleteAbTest.mutate();
    }
  };

  const formatTimeRemaining = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  if (isLoading) return null;

  // Completed state
  if (abTest && isCompleted) {
    const rateA = openRateA ? `${openRateA}%` : '—';
    const rateB = openRateB ? `${openRateB}%` : '—';

    return (
      <div className="rounded-lg border bg-card p-4 space-y-4">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Teste A/B concluído</span>
          <Badge variant="default" className="bg-emerald-600">
            <Trophy className="h-3 w-3 mr-1" />
            Variante {winner?.toUpperCase()} venceu
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className={`rounded-md border p-3 ${winner === 'a' ? 'border-emerald-500 bg-emerald-500/5' : ''}`}>
            <p className="text-xs text-muted-foreground mb-1">Variante A</p>
            <p className="text-sm font-medium truncate">{abTest.variant_a_subject}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span>{abTest.variant_a_sent} enviados</span>
              <span>{rateA} abertura</span>
            </div>
            {winner === 'a' && (
              <Badge variant="outline" className="mt-2 text-emerald-600 border-emerald-500">
                <Trophy className="h-3 w-3 mr-1" /> Vencedor
              </Badge>
            )}
          </div>

          <div className={`rounded-md border p-3 ${winner === 'b' ? 'border-emerald-500 bg-emerald-500/5' : ''}`}>
            <p className="text-xs text-muted-foreground mb-1">Variante B</p>
            <p className="text-sm font-medium truncate">{abTest.variant_b_subject}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span>{abTest.variant_b_sent} enviados</span>
              <span>{rateB} abertura</span>
            </div>
            {winner === 'b' && (
              <Badge variant="outline" className="mt-2 text-emerald-600 border-emerald-500">
                <Trophy className="h-3 w-3 mr-1" /> Vencedor
              </Badge>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Testing state
  if (abTest && abTest.status === 'testing') {
    return (
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-amber-600 animate-pulse" />
          <span className="text-sm font-semibold">Teste A/B em curso</span>
          {timeRemaining !== null && (
            <Badge variant="outline" className="text-amber-600 border-amber-500/30">
              <Clock className="h-3 w-3 mr-1" />
              {formatTimeRemaining(timeRemaining)} restantes
            </Badge>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-md border p-2">
            <p className="text-xs text-muted-foreground">A: {abTest.variant_a_subject}</p>
            <p className="font-medium mt-1">{openRateA ?? '0'}% abertura</p>
          </div>
          <div className="rounded-md border p-2">
            <p className="text-xs text-muted-foreground">B: {abTest.variant_b_subject}</p>
            <p className="font-medium mt-1">{openRateB ?? '0'}% abertura</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Switch
          checked={enabled}
          onCheckedChange={handleToggle}
          disabled={tooFewRecipients}
        />
        <div className="flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Testar variação de assunto A/B</span>
        </div>
        {tooFewRecipients && (
          <Badge variant="outline" className="text-xs text-muted-foreground">
            Mínimo 100 destinatários
          </Badge>
        )}
      </div>

      {enabled && !abTest && (
        <div className="rounded-lg border bg-card p-4 space-y-4 ml-10">
          <div className="space-y-2">
            <Label className="text-xs">Assunto A</Label>
            <Input
              value={subjectA}
              onChange={(e) => setSubjectA(e.target.value)}
              placeholder="Assunto original"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Assunto B</Label>
            <Input
              value={subjectB}
              onChange={(e) => setSubjectB(e.target.value)}
              placeholder="Escreve uma alternativa..."
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">
              Tamanho do teste: {testPct}%
            </Label>
            <Slider
              value={[testPct]}
              onValueChange={([v]) => setTestPct(v)}
              min={5}
              max={40}
              step={5}
            />
            <p className="text-xs text-muted-foreground">
              {recipientsPerVariant} contactos receberão cada variante
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Aguardar antes de enviar ao resto</Label>
            <Select value={String(waitHours)} onValueChange={(v) => setWaitHours(Number(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2 horas</SelectItem>
                <SelectItem value="4">4 horas</SelectItem>
                <SelectItem value="8">8 horas</SelectItem>
                <SelectItem value="24">24 horas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Métrica vencedora</Label>
            <RadioGroup value={metric} onValueChange={(v) => setMetric(v as 'open_rate' | 'click_rate')} className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="open_rate" />
                <BarChart3 className="h-3 w-3" />
                <span className="text-sm">Taxa de abertura</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="click_rate" />
                <MousePointerClick className="h-3 w-3" />
                <span className="text-sm">Taxa de cliques</span>
              </label>
            </RadioGroup>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!subjectA || !subjectB || createAbTest.isPending}
            >
              {createAbTest.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Guardar configuração A/B
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setEnabled(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
