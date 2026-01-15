import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart3, 
  MessageSquare, 
  Bot, 
  User,
  TrendingUp,
  CheckCircle,
  Calendar,
  BookOpen
} from "lucide-react";
import type { AIProfile } from "@/types/ai-profiles";
import { PROFILE_TYPES } from "@/types/ai-profiles";

interface AIProfileMetricsProps {
  profiles: AIProfile[];
}

export function AIProfileMetrics({ profiles }: AIProfileMetricsProps) {
  // Calculate aggregate metrics
  const totalInteractions = profiles.reduce((sum, p) => sum + (p.totalInteractions || 0), 0);
  const totalAutoResponses = profiles.reduce((sum, p) => sum + (p.autoResponses || 0), 0);
  const totalAssistedResponses = profiles.reduce((sum, p) => sum + (p.assistedResponses || 0), 0);
  const autoRate = totalInteractions > 0 ? (totalAutoResponses / totalInteractions) * 100 : 0;

  const activeProfiles = profiles.filter(p => p.isActive).length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeProfiles}</p>
                <p className="text-sm text-muted-foreground">Perfis Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-500/10">
                <MessageSquare className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalInteractions}</p>
                <p className="text-sm text-muted-foreground">Total Interações</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-500/10">
                <Bot className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalAutoResponses}</p>
                <p className="text-sm text-muted-foreground">Respostas Auto</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-amber-500/10">
                <User className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalAssistedResponses}</p>
                <p className="text-sm text-muted-foreground">Com Assistência</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Automation Rate */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Taxa de Automação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Respostas Automáticas</span>
              <span className="font-medium">{autoRate.toFixed(1)}%</span>
            </div>
            <Progress value={autoRate} className="h-2" />
            <p className="text-xs text-muted-foreground">
              Percentagem de interações resolvidas automaticamente pela IA
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Metrics by Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Métricas por Perfil</CardTitle>
        </CardHeader>
        <CardContent>
          {profiles.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum perfil configurado para mostrar métricas
            </p>
          ) : (
            <div className="space-y-4">
              {profiles.map((profile) => {
                const typeConfig = PROFILE_TYPES[profile.profileType];
                const interactions = profile.totalInteractions || 0;
                const auto = profile.autoResponses || 0;
                const rate = interactions > 0 ? (auto / interactions) * 100 : 0;

                return (
                  <div key={profile.id} className="p-4 rounded-lg border">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Badge className={typeConfig?.color || 'bg-muted'}>
                          {typeConfig?.label || profile.profileType}
                        </Badge>
                        <span className="font-medium">{profile.name}</span>
                        {!profile.isActive && (
                          <Badge variant="outline" className="text-xs">Inativo</Badge>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Interações</p>
                        <p className="font-medium flex items-center gap-1">
                          <MessageSquare className="h-3.5 w-3.5" />
                          {interactions}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Automáticas</p>
                        <p className="font-medium flex items-center gap-1">
                          <Bot className="h-3.5 w-3.5 text-green-500" />
                          {auto}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Assistidas</p>
                        <p className="font-medium flex items-center gap-1">
                          <User className="h-3.5 w-3.5 text-amber-500" />
                          {profile.assistedResponses || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Taxa Auto</p>
                        <p className="font-medium">{rate.toFixed(1)}%</p>
                      </div>
                    </div>

                    {/* Profile-specific metrics */}
                    <div className="mt-3 pt-3 border-t flex flex-wrap gap-4 text-sm">
                      {profile.profileType === 'vendas' && (
                        <div className="flex items-center gap-1 text-green-600">
                          <TrendingUp className="h-3.5 w-3.5" />
                          <span>{profile.conversions || 0} conversões</span>
                        </div>
                      )}
                      {profile.profileType === 'suporte' && (
                        <div className="flex items-center gap-1 text-blue-600">
                          <CheckCircle className="h-3.5 w-3.5" />
                          <span>{profile.resolutions || 0} resoluções</span>
                        </div>
                      )}
                      {profile.profileType === 'clinica' && (
                        <div className="flex items-center gap-1 text-pink-600">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>0 consultas marcadas</span>
                        </div>
                      )}
                      {profile.profileType === 'formacao' && (
                        <div className="flex items-center gap-1 text-purple-600">
                          <BookOpen className="h-3.5 w-3.5" />
                          <span>0 progressões</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Governance Info */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="text-center text-sm text-muted-foreground">
            <p className="mb-2">
              <strong>Auditoria:</strong> Cada resposta da IA regista o perfil utilizado para fins de governança.
            </p>
            <p>
              A IA só responde com conteúdo validado e respeita os limites definidos em cada perfil.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
