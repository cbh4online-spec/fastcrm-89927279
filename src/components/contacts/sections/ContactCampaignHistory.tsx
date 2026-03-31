import { useContactCampaignHistory, getEngagementBadge } from '@/hooks/useContactCampaignHistory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, Eye, MousePointer, AlertTriangle, Send, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { RECIPIENT_STATUS_LABELS } from '@/types/marketing';
import type { RecipientStatus } from '@/types/marketing';

interface Props {
  contactId?: string;
  leadId?: string;
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  sent: <Send className="h-3 w-3" />,
  delivered: <Mail className="h-3 w-3" />,
  opened: <Eye className="h-3 w-3" />,
  clicked: <MousePointer className="h-3 w-3" />,
  bounced: <AlertTriangle className="h-3 w-3" />,
  complained: <AlertTriangle className="h-3 w-3" />,
};

const STATUS_COLORS: Record<string, string> = {
  sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  delivered: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  opened: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  clicked: 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200',
  bounced: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  complained: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  unsubscribed: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  pending: 'bg-muted text-muted-foreground',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export function ContactCampaignHistory({ contactId, leadId }: Props) {
  const { data: interactions = [], isLoading } = useContactCampaignHistory(contactId, leadId);
  const engagement = getEngagementBadge(interactions);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          A carregar histórico de campanhas...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Engagement Summary */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              Marketing
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={engagement.variant} className="gap-1">
                {engagement.label}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {interactions.length} campanha{interactions.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {interactions.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-4">
              Sem interações de campanha registadas.
            </p>
          ) : (
            <div className="space-y-3">
              {/* Quick Stats */}
              <div className="grid grid-cols-4 gap-3 pb-3 border-b">
                <div className="text-center">
                  <div className="text-lg font-bold">{interactions.length}</div>
                  <div className="text-xs text-muted-foreground">Recebidas</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold">
                    {interactions.filter(i => i.openedAt).length}
                  </div>
                  <div className="text-xs text-muted-foreground">Abertas</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold">
                    {interactions.filter(i => i.clickedAt).length}
                  </div>
                  <div className="text-xs text-muted-foreground">Clicadas</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-destructive">
                    {interactions.filter(i => i.status === 'bounced' || i.status === 'complained').length}
                  </div>
                  <div className="text-xs text-muted-foreground">Problemas</div>
                </div>
              </div>

              {/* Campaign List */}
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {interactions.map((interaction) => (
                  <div
                    key={interaction.campaignId}
                    className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors"
                  >
                    <div className="mt-0.5">
                      {STATUS_ICONS[interaction.status] || <Mail className="h-3 w-3" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate">
                          {interaction.campaignName}
                        </span>
                        <Badge className={`text-xs ${STATUS_COLORS[interaction.status] || ''}`}>
                          {RECIPIENT_STATUS_LABELS[interaction.status as RecipientStatus] || interaction.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {interaction.campaignSubject}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {interaction.sentAt && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(interaction.sentAt), "d MMM yyyy, HH:mm", { locale: pt })}
                          </span>
                        )}
                        {interaction.events.length > 0 && (
                          <span>{interaction.events.length} evento{interaction.events.length !== 1 ? 's' : ''}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
