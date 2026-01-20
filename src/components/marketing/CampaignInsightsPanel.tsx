import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Lightbulb, 
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { MarketingCampaign, CampaignInsights } from '@/types/marketing';

interface CampaignInsightsPanelProps {
  campaign: MarketingCampaign;
  onInsightsUpdated?: () => void;
}

export function CampaignInsightsPanel({ campaign, onInsightsUpdated }: CampaignInsightsPanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  // Get existing insights from campaign
  const insights = campaign.aiInsights;
  const insightsGeneratedAt = campaign.aiInsightsGeneratedAt;
  
  const generateInsights = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('marketing-campaign-insights', {
        body: { campaignId: campaign.id },
      });
      
      if (error) throw error;
      
      if (data.error) {
        if (data.error.includes('Rate limit')) {
          toast.error('Limite de pedidos atingido. Tenta novamente em alguns minutos.');
        } else if (data.error.includes('credits')) {
          toast.error('Créditos de IA esgotados. Contacta o suporte.');
        } else {
          toast.error(data.error);
        }
        return;
      }
      
      toast.success('Insights gerados com sucesso!');
      onInsightsUpdated?.();
    } catch (error) {
      console.error('Error generating insights:', error);
      toast.error('Erro ao gerar insights');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Only show for sent campaigns
  if (campaign.status !== 'sent') {
    return null;
  }
  
  // Check if we have enough data
  const hasEnoughData = (campaign.sentCount || 0) >= 10;
  
  if (!hasEnoughData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Insights de IA
          </CardTitle>
          <CardDescription>
            São necessários pelo menos 10 emails enviados para gerar insights.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Insights de IA
            </CardTitle>
            <CardDescription>
              Análise automática da performance da campanha
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={generateInsights}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {insights ? 'Atualizar' : 'Gerar'} Insights
          </Button>
        </div>
        {insightsGeneratedAt && (
          <p className="text-xs text-muted-foreground mt-2">
            Última análise: {new Date(insightsGeneratedAt).toLocaleString('pt-PT')}
          </p>
        )}
      </CardHeader>
      
      {insights ? (
        <CardContent className="space-y-6">
          {/* Resumo */}
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm font-medium mb-1">Resumo</p>
            <p className="text-sm text-muted-foreground">{insights.resumo}</p>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            {/* O que funcionou */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <p className="text-sm font-medium">O que funcionou</p>
              </div>
              <ul className="space-y-2">
                {insights.funcionou?.map((item, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <TrendingUp className="h-3 w-3 mt-1 text-green-500 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
                {(!insights.funcionou || insights.funcionou.length === 0) && (
                  <li className="text-sm text-muted-foreground italic">
                    Sem destaques positivos identificados
                  </li>
                )}
              </ul>
            </div>
            
            {/* O que pode melhorar */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <p className="text-sm font-medium">O que pode melhorar</p>
              </div>
              <ul className="space-y-2">
                {insights.melhorar?.map((item, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <TrendingDown className="h-3 w-3 mt-1 text-amber-500 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
                {(!insights.melhorar || insights.melhorar.length === 0) && (
                  <li className="text-sm text-muted-foreground italic">
                    Sem pontos de melhoria identificados
                  </li>
                )}
              </ul>
            </div>
          </div>
          
          <Separator />
          
          {/* Sugestões */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium">Sugestões Práticas</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {insights.sugestoes?.map((sugestao, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {sugestao}
                </Badge>
              ))}
              {(!insights.sugestoes || insights.sugestoes.length === 0) && (
                <p className="text-sm text-muted-foreground italic">
                  Sem sugestões específicas
                </p>
              )}
            </div>
          </div>
        </CardContent>
      ) : (
        <CardContent>
          <div className="text-center py-8">
            <Sparkles className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              Clica em "Gerar Insights" para obter uma análise automática desta campanha
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
