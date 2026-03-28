import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UserX, Mail, ArrowLeft } from 'lucide-react';
import { SmartForm } from '@/types/smartForm';
import { useMemo } from 'react';

interface PartialSubmissionTrackerProps {
  form: SmartForm;
  onBack: () => void;
}

interface PartialLead {
  id: string;
  email?: string;
  fieldsCompleted: number;
  totalFields: number;
  lastFieldReached: string;
  abandonedAt: string;
  timeSpent: string;
}

export function PartialSubmissionTracker({ form, onBack }: PartialSubmissionTrackerProps) {
  // Mock partial submissions data
  const partialLeads = useMemo<PartialLead[]>(() => {
    const fields = form.schema?.fields || [];
    if (fields.length === 0) return [];

    return Array.from({ length: Math.min(5, Math.max(0, form.submission_count)) }, (_, i) => ({
      id: `partial_${i}`,
      email: i % 2 === 0 ? `lead${i + 1}@email.com` : undefined,
      fieldsCompleted: Math.max(1, Math.floor(Math.random() * fields.length)),
      totalFields: fields.length,
      lastFieldReached: fields[Math.min(Math.floor(Math.random() * fields.length), fields.length - 1)]?.label || 'Campo 1',
      abandonedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-PT'),
      timeSpent: `${Math.floor(Math.random() * 3)}m ${Math.floor(Math.random() * 59)}s`,
    }));
  }, [form]);

  const completionRate = (completed: number, total: number) => Math.round((completed / total) * 100);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-xl font-semibold">Submissões Parciais — {form.name}</h2>
          <p className="text-muted-foreground text-sm">Leads que começaram mas não terminaram</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <UserX className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-muted-foreground">Abandonos</span>
            </div>
            <p className="text-2xl font-bold">{partialLeads.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Mail className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Com Email</span>
            </div>
            <p className="text-2xl font-bold">{partialLeads.filter(l => l.email).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <span className="text-xs text-muted-foreground">Conclusão Média</span>
            <p className="text-2xl font-bold">
              {partialLeads.length > 0
                ? Math.round(partialLeads.reduce((sum, l) => sum + completionRate(l.fieldsCompleted, l.totalFields), 0) / partialLeads.length)
                : 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Partial leads list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quase-Leads</CardTitle>
          <CardDescription>Utilizadores que iniciaram o formulário mas não completaram</CardDescription>
        </CardHeader>
        <CardContent>
          {partialLeads.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Sem submissões parciais registadas.
            </p>
          ) : (
            <div className="space-y-3">
              {partialLeads.map((lead) => (
                <div key={lead.id} className="flex items-center gap-4 p-3 rounded-lg border">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {lead.email ? (
                        <span className="text-sm font-medium">{lead.email}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground italic">Email não captado</span>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {completionRate(lead.fieldsCompleted, lead.totalFields)}% preenchido
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Abandonou em "{lead.lastFieldReached}" · {lead.timeSpent} no formulário · {lead.abandonedAt}
                    </p>
                  </div>
                  {lead.email && (
                    <Button variant="outline" size="sm" className="shrink-0 gap-1">
                      <Mail className="h-3.5 w-3.5" />
                      Recuperar
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
