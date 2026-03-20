import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDynamicSegment } from '@/hooks/useDynamicSegment';
import {
  Users, Target, Activity, AlertTriangle, UserX, Eye,
  Loader2, Plus, Trash2, ToggleLeft, Filter,
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

const SEGMENT_PRESETS = [
  { key: 'active', label: 'Contactos activos', desc: 'Abriram pelo menos 1 email nos últimos 30 dias', icon: Activity, color: 'text-emerald-500' },
  { key: 'highly_engaged', label: 'Muito engajados', desc: 'Abriram >50% das últimas 5 campanhas', icon: Target, color: 'text-blue-500' },
  { key: 'at_risk', label: 'Em risco', desc: 'Não abrem há 30–60 dias', icon: AlertTriangle, color: 'text-amber-500' },
  { key: 'inactive', label: 'Inactivos', desc: 'Não abrem há mais de 60 dias', icon: UserX, color: 'text-red-500' },
  { key: 'never_opened', label: 'Nunca abriram', desc: '0 aberturas históricas', icon: Eye, color: 'text-muted-foreground' },
];

const RULE_FIELDS = [
  { value: 'opened_campaign', label: 'Abriu campanha' },
  { value: 'clicked_link', label: 'Clicou em link' },
  { value: 'received_campaign', label: 'Recebeu campanha' },
  { value: 'not_opened', label: 'Não abriu' },
  { value: 'contact_tag', label: 'Tag de contacto' },
  { value: 'contact_field', label: 'Campo de contacto' },
];

const RULE_OPERATORS = [
  { value: 'in_last_days', label: 'Nos últimos X dias' },
  { value: 'more_than', label: 'Mais de X vezes' },
  { value: 'never', label: 'Nunca' },
  { value: 'equals', label: 'Igual a' },
  { value: 'contains', label: 'Contém' },
];

interface CustomRule {
  id: string;
  field: string;
  operator: string;
  value: string;
}

interface Props {
  onSegmentSelect?: (contactIds: string[], segmentName: string) => void;
}

export function DynamicSegmentsPanel({ onSegmentSelect }: Props) {
  const { evaluateSegment, isEvaluating } = useDynamicSegment();
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);
  const [segmentResult, setSegmentResult] = useState<{ count: number; contact_ids: string[] } | null>(null);
  const [showCustomBuilder, setShowCustomBuilder] = useState(false);
  const [customLogic, setCustomLogic] = useState<'AND' | 'OR'>('AND');
  const [customRules, setCustomRules] = useState<CustomRule[]>([
    { id: '1', field: 'opened_campaign', operator: 'in_last_days', value: '30' },
  ]);

  const handleEvaluate = async (segmentType: string) => {
    setSelectedSegment(segmentType);
    setShowCustomBuilder(false);
    evaluateSegment.mutate(
      { segment_type: segmentType },
      { onSuccess: (data) => setSegmentResult(data) }
    );
  };

  const handleEvaluateCustom = () => {
    setSelectedSegment('custom');
    evaluateSegment.mutate(
      {
        segment_type: 'custom',
        rules: { logic: customLogic, conditions: customRules },
      },
      { onSuccess: (data) => setSegmentResult(data) }
    );
  };

  const addRule = () => {
    setCustomRules(prev => [
      ...prev,
      { id: String(Date.now()), field: 'opened_campaign', operator: 'in_last_days', value: '30' },
    ]);
  };

  const removeRule = (id: string) => {
    setCustomRules(prev => prev.filter(r => r.id !== id));
  };

  const updateRule = (id: string, updates: Partial<CustomRule>) => {
    setCustomRules(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          Segmentos Dinâmicos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Pre-built segments */}
        {SEGMENT_PRESETS.map((seg) => {
          const Icon = seg.icon;
          const isSelected = selectedSegment === seg.key;
          const isActive = isSelected && segmentResult;

          return (
            <div
              key={seg.key}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 ${isSelected ? 'border-primary bg-primary/5' : ''}`}
              onClick={() => handleEvaluate(seg.key)}
            >
              <Icon className={`h-4 w-4 shrink-0 ${seg.color}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{seg.label}</p>
                <p className="text-xs text-muted-foreground">{seg.desc}</p>
              </div>
              {isSelected && isEvaluating && <Loader2 className="h-4 w-4 animate-spin shrink-0" />}
              {isActive && (
                <Badge variant="secondary" className="shrink-0">
                  {segmentResult.count} contactos
                </Badge>
              )}
            </div>
          );
        })}

        {/* Custom Segment Builder */}
        <Collapsible open={showCustomBuilder} onOpenChange={setShowCustomBuilder}>
          <CollapsibleTrigger asChild>
            <div
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 ${showCustomBuilder ? 'border-primary bg-primary/5' : 'border-dashed'}`}
            >
              <Filter className="h-4 w-4 text-primary shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">Personalizado</p>
                <p className="text-xs text-muted-foreground">Construir regras com lógica AND/OR</p>
              </div>
              {selectedSegment === 'custom' && segmentResult && (
                <Badge variant="secondary" className="shrink-0">
                  {segmentResult.count} contactos
                </Badge>
              )}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <div className="space-y-3 p-3 bg-muted/30 rounded-lg border">
              {/* Logic toggle */}
              <div className="flex items-center gap-2">
                <Label className="text-xs">Lógica:</Label>
                <Button
                  variant={customLogic === 'AND' ? 'default' : 'outline'}
                  size="sm"
                  className="h-6 text-xs px-2"
                  onClick={() => setCustomLogic('AND')}
                >
                  AND (todas)
                </Button>
                <Button
                  variant={customLogic === 'OR' ? 'default' : 'outline'}
                  size="sm"
                  className="h-6 text-xs px-2"
                  onClick={() => setCustomLogic('OR')}
                >
                  OR (qualquer)
                </Button>
              </div>

              {/* Rules */}
              {customRules.map((rule, index) => (
                <div key={rule.id} className="flex items-center gap-2">
                  {index > 0 && (
                    <span className="text-[10px] font-medium text-muted-foreground w-8 text-center shrink-0">
                      {customLogic}
                    </span>
                  )}
                  {index === 0 && <span className="w-8 shrink-0" />}
                  <Select value={rule.field} onValueChange={(v) => updateRule(rule.id, { field: v })}>
                    <SelectTrigger className="h-7 text-xs flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RULE_FIELDS.map(f => (
                        <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={rule.operator} onValueChange={(v) => updateRule(rule.id, { operator: v })}>
                    <SelectTrigger className="h-7 text-xs w-36 shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RULE_OPERATORS.map(o => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {rule.operator !== 'never' && (
                    <Input
                      value={rule.value}
                      onChange={(e) => updateRule(rule.id, { value: e.target.value })}
                      className="h-7 text-xs w-20 shrink-0"
                      placeholder="Valor"
                    />
                  )}
                  {customRules.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-destructive"
                      onClick={() => removeRule(rule.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={addRule}>
                  <Plus className="h-3 w-3" /> Adicionar regra
                </Button>
                <Button
                  size="sm"
                  className="h-7 text-xs gap-1 ml-auto"
                  onClick={handleEvaluateCustom}
                  disabled={isEvaluating}
                >
                  {isEvaluating && selectedSegment === 'custom' ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Target className="h-3 w-3" />
                  )}
                  Avaliar segmento
                </Button>
              </div>

              {selectedSegment === 'custom' && segmentResult && (
                <div className="p-2 bg-primary/5 rounded text-sm text-center">
                  Este segmento tem <strong>{segmentResult.count}</strong> contactos
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Use segment button */}
        {segmentResult && segmentResult.count > 0 && onSegmentSelect && (
          <Button
            className="w-full"
            onClick={() =>
              onSegmentSelect(
                segmentResult.contact_ids,
                selectedSegment === 'custom'
                  ? 'Segmento personalizado'
                  : SEGMENT_PRESETS.find(s => s.key === selectedSegment)?.label || ''
              )
            }
          >
            <Users className="h-4 w-4 mr-2" />
            Usar este segmento ({segmentResult.count})
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
