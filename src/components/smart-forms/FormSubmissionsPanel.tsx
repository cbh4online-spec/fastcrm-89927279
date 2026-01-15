import { useState } from 'react';
import { useFormSubmissions } from '@/hooks/useSmartForms';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Search, 
  Flame, 
  Snowflake, 
  ThermometerSun,
  ArrowLeft,
  User,
  Building,
  Target,
  Sparkles,
  ExternalLink,
  Calendar,
} from 'lucide-react';
import { SmartForm, FormSubmission } from '@/types/smartForm';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface FormSubmissionsPanelProps {
  form: SmartForm;
  onBack: () => void;
}

const TEMPERATURE_CONFIG = {
  hot: { icon: Flame, color: 'text-red-500', bg: 'bg-red-100', label: 'Quente' },
  warm: { icon: ThermometerSun, color: 'text-amber-500', bg: 'bg-amber-100', label: 'Morno' },
  cold: { icon: Snowflake, color: 'text-blue-500', bg: 'bg-blue-100', label: 'Frio' },
};

export function FormSubmissionsPanel({ form, onBack }: FormSubmissionsPanelProps) {
  const { data: submissions, isLoading } = useFormSubmissions(form.id);
  const [search, setSearch] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null);
  const navigate = useNavigate();

  const filteredSubmissions = submissions?.filter(sub => {
    const searchLower = search.toLowerCase();
    const rawData = sub.raw_data as Record<string, unknown>;
    return Object.values(rawData).some(val => 
      String(val).toLowerCase().includes(searchLower)
    );
  }) || [];

  // Stats
  const stats = {
    total: submissions?.length || 0,
    hot: submissions?.filter(s => s.temperature === 'hot').length || 0,
    avgScore: submissions?.length 
      ? Math.round(submissions.reduce((sum, s) => sum + s.score, 0) / submissions.length)
      : 0,
    converted: submissions?.filter(s => s.opportunity_id).length || 0,
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-40" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-xl font-semibold">{form.name}</h2>
          <p className="text-muted-foreground">Submissões do formulário</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-sm text-muted-foreground">Total de submissões</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-red-500" />
              <span className="text-2xl font-bold">{stats.hot}</span>
            </div>
            <p className="text-sm text-muted-foreground">Leads quentes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.avgScore}</div>
            <p className="text-sm text-muted-foreground">Score médio</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{stats.converted}</span>
            </div>
            <p className="text-sm text-muted-foreground">Oportunidades criadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar submissões..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Submissions List */}
      {filteredSubmissions.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">Nenhuma submissão encontrada</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <ScrollArea className="h-[500px]">
            <div className="divide-y">
              {filteredSubmissions.map((submission) => {
                const rawData = submission.raw_data as Record<string, unknown>;
                const tempConfig = TEMPERATURE_CONFIG[submission.temperature as keyof typeof TEMPERATURE_CONFIG] || TEMPERATURE_CONFIG.cold;
                const TempIcon = tempConfig.icon;

                return (
                  <div
                    key={submission.id}
                    className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => setSelectedSubmission(submission)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {String(rawData.name || rawData.nome || rawData.email || 'Submissão')}
                          </span>
                          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${tempConfig.bg}`}>
                            <TempIcon className={`h-3 w-3 ${tempConfig.color}`} />
                            <span className={tempConfig.color}>{tempConfig.label}</span>
                          </div>
                          <Badge variant="outline">{submission.score} pts</Badge>
                        </div>
                        
                        {submission.ai_summary && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {submission.ai_summary}
                          </p>
                        )}

                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(submission.created_at), "d MMM 'às' HH:mm", { locale: pt })}
                          </span>
                          {submission.lead_id && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              Lead criado
                            </span>
                          )}
                          {submission.opportunity_id && (
                            <span className="flex items-center gap-1">
                              <Target className="h-3 w-3" />
                              Oportunidade
                            </span>
                          )}
                        </div>
                      </div>

                      {submission.ai_next_action && (
                        <Badge variant="secondary" className="text-xs">
                          {submission.ai_next_action}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </Card>
      )}

      {/* Submission Detail Dialog */}
      <Dialog open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Submissão</DialogTitle>
            <DialogDescription>
              {selectedSubmission && format(new Date(selectedSubmission.created_at), "d 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: pt })}
            </DialogDescription>
          </DialogHeader>

          {selectedSubmission && (
            <div className="space-y-6">
              {/* Score & Temperature */}
              <div className="flex items-center gap-4">
                {(() => {
                  const tempConfig = TEMPERATURE_CONFIG[selectedSubmission.temperature as keyof typeof TEMPERATURE_CONFIG] || TEMPERATURE_CONFIG.cold;
                  const TempIcon = tempConfig.icon;
                  return (
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${tempConfig.bg}`}>
                      <TempIcon className={`h-5 w-5 ${tempConfig.color}`} />
                      <span className={`font-medium ${tempConfig.color}`}>{tempConfig.label}</span>
                    </div>
                  );
                })()}
                <Badge variant="outline" className="text-lg px-3 py-1">
                  {selectedSubmission.score} pontos
                </Badge>
              </div>

              {/* AI Summary */}
              {selectedSubmission.ai_summary && (
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-2">
                      <Sparkles className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">{selectedSubmission.ai_summary}</p>
                        {selectedSubmission.ai_next_action && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Ação recomendada: {selectedSubmission.ai_next_action}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Separator />

              {/* Raw Data */}
              <div>
                <h4 className="font-medium mb-3">Dados Submetidos</h4>
                <div className="space-y-2">
                  {Object.entries(selectedSubmission.raw_data as Record<string, unknown>).map(([key, value]) => (
                    <div key={key} className="flex items-start gap-3 py-2 border-b last:border-0">
                      <span className="text-muted-foreground min-w-24">{key}</span>
                      <span className="font-medium">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Enriched Data */}
              {selectedSubmission.enriched_data && Object.keys(selectedSubmission.enriched_data as object).length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Dados Enriquecidos
                    </h4>
                    <pre className="text-sm bg-muted p-3 rounded-lg overflow-auto">
                      {JSON.stringify(selectedSubmission.enriched_data, null, 2)}
                    </pre>
                  </div>
                </>
              )}

              {/* Links */}
              <div className="flex items-center gap-2">
                {selectedSubmission.lead_id && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate(`/dashboard/leads/${selectedSubmission.lead_id}`)}
                  >
                    <User className="h-4 w-4 mr-2" />
                    Ver Lead
                    <ExternalLink className="h-3 w-3 ml-2" />
                  </Button>
                )}
                {selectedSubmission.opportunity_id && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate(`/dashboard/opportunities`)}
                  >
                    <Target className="h-4 w-4 mr-2" />
                    Ver Oportunidade
                    <ExternalLink className="h-3 w-3 ml-2" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
