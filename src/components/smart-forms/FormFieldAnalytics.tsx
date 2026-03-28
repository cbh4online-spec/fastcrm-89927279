import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface FieldStat {
  fieldId: string;
  label: string;
  type: string;
  required: boolean;
  fillRate: number;
  dropOffRate: number;
  avgTimeSeconds: number;
}

interface FormFieldAnalyticsProps {
  fields: FieldStat[];
}

export function FormFieldAnalytics({ fields }: FormFieldAnalyticsProps) {
  const getHealthColor = (fillRate: number) => {
    if (fillRate >= 80) return 'text-green-500';
    if (fillRate >= 60) return 'text-amber-500';
    return 'text-red-500';
  };

  const getProgressColor = (fillRate: number) => {
    if (fillRate >= 80) return 'bg-green-500';
    if (fillRate >= 60) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Analytics por Campo</CardTitle>
        <CardDescription>Taxa de preenchimento e tempo gasto por campo</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {fields.map((field) => (
            <div key={field.fieldId} className="flex items-center gap-4 p-3 rounded-lg border">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm truncate">{field.label}</span>
                  <Badge variant="outline" className="text-xs">{field.type}</Badge>
                  {field.required && <Badge variant="secondary" className="text-xs">Req.</Badge>}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <Progress value={field.fillRate} className="h-2" />
                  </div>
                  <span className={`text-sm font-medium tabular-nums ${getHealthColor(field.fillRate)}`}>
                    {field.fillRate}%
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-muted-foreground">Tempo médio</p>
                <p className="text-sm font-medium">{field.avgTimeSeconds}s</p>
              </div>
              {field.dropOffRate > 30 && (
                <Badge variant="destructive" className="text-xs shrink-0">
                  -{field.dropOffRate}%
                </Badge>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
