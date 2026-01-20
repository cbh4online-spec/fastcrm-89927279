import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Mail, 
  Users, 
  Send, 
  MousePointer, 
  Eye,
  AlertTriangle,
  TrendingUp,
  ArrowRight
} from 'lucide-react';
import { useMarketingUsage } from '@/hooks/useMarketingSettings';
import { useMarketingCampaigns } from '@/hooks/useMarketingCampaigns';
import { calculateCampaignStats, CAMPAIGN_STATUS_LABELS, CAMPAIGN_STATUS_COLORS } from '@/types/marketing';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export function MarketingDashboard() {
  const navigate = useNavigate();
  const { data: usage, isLoading: usageLoading } = useMarketingUsage();
  const { data: campaigns = [], isLoading: campaignsLoading } = useMarketingCampaigns();

  const recentCampaigns = campaigns.slice(0, 5);
  
  // Calculate aggregate stats
  const sentCampaigns = campaigns.filter(c => c.status === 'sent');
  const totalSent = sentCampaigns.reduce((sum, c) => sum + c.sentCount, 0);
  const totalDelivered = sentCampaigns.reduce((sum, c) => sum + c.deliveredCount, 0);
  const totalOpened = sentCampaigns.reduce((sum, c) => sum + c.openedCount, 0);
  const totalClicked = sentCampaigns.reduce((sum, c) => sum + c.clickedCount, 0);

  const avgOpenRate = totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0;
  const avgClickRate = totalDelivered > 0 ? (totalClicked / totalDelivered) * 100 : 0;

  const emailUsagePercent = usage ? (usage.emailsSent / usage.emailsLimit) * 100 : 0;
  const contactsUsagePercent = usage ? (usage.activeContacts / usage.contactsLimit) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Usage Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emails Enviados</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {usage?.emailsSent || 0}
              <span className="text-sm font-normal text-muted-foreground">
                / {usage?.emailsLimit || 1000}
              </span>
            </div>
            <Progress value={emailUsagePercent} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {emailUsagePercent.toFixed(0)}% do limite mensal
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contactos Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {usage?.activeContacts || 0}
              <span className="text-sm font-normal text-muted-foreground">
                / {usage?.contactsLimit || 500}
              </span>
            </div>
            <Progress value={contactsUsagePercent} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {contactsUsagePercent.toFixed(0)}% do limite
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Abertura</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgOpenRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalOpened} aberturas de {totalDelivered} entregues
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Cliques</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgClickRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalClicked} cliques de {totalDelivered} entregues
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Campaigns */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Campanhas Recentes
          </CardTitle>
          <CardDescription>
            As últimas campanhas criadas ou enviadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentCampaigns.length === 0 ? (
            <div className="text-center py-8">
              <Mail className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <p className="mt-2 text-muted-foreground">Ainda não criaste nenhuma campanha</p>
              <Button variant="outline" className="mt-4">
                <Send className="h-4 w-4 mr-2" />
                Criar Primeira Campanha
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {recentCampaigns.map((campaign) => {
                const stats = calculateCampaignStats(campaign);
                return (
                  <div
                    key={campaign.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{campaign.name}</span>
                        <Badge className={CAMPAIGN_STATUS_COLORS[campaign.status]}>
                          {CAMPAIGN_STATUS_LABELS[campaign.status]}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {campaign.subject}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(campaign.createdAt), "d 'de' MMMM, yyyy", { locale: pt })}
                      </p>
                    </div>
                    
                    {campaign.status === 'sent' && (
                      <div className="flex items-center gap-6 text-sm">
                        <div className="text-center">
                          <div className="font-medium">{campaign.sentCount}</div>
                          <div className="text-xs text-muted-foreground">Enviados</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium">{stats.openRate.toFixed(1)}%</div>
                          <div className="text-xs text-muted-foreground">Abertura</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium">{stats.clickRate.toFixed(1)}%</div>
                          <div className="text-xs text-muted-foreground">Cliques</div>
                        </div>
                      </div>
                    )}
                    
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tips / Alerts */}
      {emailUsagePercent > 80 && (
        <Card className="border-amber-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Atenção ao Limite
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Estás a usar {emailUsagePercent.toFixed(0)}% do teu limite mensal de emails. 
              Considera fazer upgrade do teu plano para continuar a enviar campanhas.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
