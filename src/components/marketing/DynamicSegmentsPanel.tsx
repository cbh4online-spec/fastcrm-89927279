import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDynamicSegment } from '@/hooks/useDynamicSegment';
import { Users, Target, Activity, AlertTriangle, UserX, Eye, Loader2 } from 'lucide-react';

const SEGMENT_PRESETS = [
  { key: 'active', label: 'Contactos activos', desc: 'Abriram pelo menos 1 email nos últimos 30 dias', icon: Activity, color: 'text-emerald-500' },
  { key: 'at_risk', label: 'Em risco', desc: 'Não abrem há 30–60 dias', icon: AlertTriangle, color: 'text-amber-500' },
  { key: 'inactive', label: 'Inactivos', desc: 'Não abrem há mais de 60 dias', icon: UserX, color: 'text-red-500' },
  { key: 'never_opened', label: 'Nunca abriram', desc: '0 aberturas históricas', icon: Eye, color: 'text-gray-500' },
];

interface Props {
  onSegmentSelect?: (contactIds: string[], segmentName: string) => void;
}

export function DynamicSegmentsPanel({ onSegmentSelect }: Props) {
  const { evaluateSegment, isEvaluating } = useDynamicSegment();
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);
  const [segmentResult, setSegmentResult] = useState<{ count: number; contact_ids: string[] } | null>(null);

  const handleEvaluate = async (segmentType: string) => {
    setSelectedSegment(segmentType);
    evaluateSegment.mutate(
      { segment_type: segmentType },
      {
        onSuccess: (data) => {
          setSegmentResult(data);
        },
      }
    );
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
              <Icon className={`h-4 w-4 ${seg.color}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{seg.label}</p>
                <p className="text-xs text-muted-foreground">{seg.desc}</p>
              </div>
              {isSelected && isEvaluating && <Loader2 className="h-4 w-4 animate-spin" />}
              {isActive && (
                <Badge variant="secondary" className="shrink-0">
                  {segmentResult.count} contactos
                </Badge>
              )}
            </div>
          );
        })}

        {segmentResult && segmentResult.count > 0 && onSegmentSelect && (
          <Button
            className="w-full"
            onClick={() => onSegmentSelect(segmentResult.contact_ids, SEGMENT_PRESETS.find(s => s.key === selectedSegment)?.label || '')}
          >
            <Users className="h-4 w-4 mr-2" />
            Usar este segmento ({segmentResult.count})
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
