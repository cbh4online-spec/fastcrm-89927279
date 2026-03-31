import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Send, 
  Eye, 
  MousePointer, 
  AlertTriangle,
  CheckCircle,
  Users,
  Mail,
  Pencil,
  FlaskConical,
} from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { useCampaignRecipients, useCampaignEvents, useUpdateCampaign, useSendCampaign } from '@/hooks/useMarketingCampaigns';
import { 
  calculateCampaignStats, 
  CAMPAIGN_STATUS_LABELS, 
  CAMPAIGN_STATUS_COLORS,
  RECIPIENT_STATUS_LABELS,
} from '@/types/marketing';
import type { MarketingCampaign } from '@/types/marketing';
import { DeliverabilityPanel } from './DeliverabilityPanel';
import { ActivityFeed } from './ActivityFeed';
import { ClickHeatmapPanel } from './ClickHeatmapPanel';
import { TriggerBuilder } from './TriggerBuilder';
import { CampaignValidationPanel } from '@/components/email-campaigns/CampaignValidationPanel';
import { CampaignSendModeSelector } from '@/components/email-campaigns/CampaignSendModeSelector';
import { CampaignQueueStatus } from '@/components/email-campaigns/CampaignQueueStatus';
import { CampaignPreflightDialog } from './CampaignPreflightDialog';
import { CampaignTestSendDialog } from './CampaignTestSendDialog';
import { CampaignApprovalPanel } from './CampaignApprovalPanel';
import { EmailBuilderDialog } from './EmailBuilderDialog';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import type { EmailDesign } from '@/types/emailBuilder';

interface CampaignDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: MarketingCampaign | null;
}

export function CampaignDetailDialog({
  open,
  onOpenChange,
  campaign,
}: CampaignDetailDialogProps) {
  const [showTestSend, setShowTestSend] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const { data: recipients = [] } = useCampaignRecipients(campaign?.id);
  const { data: events = [] } = useCampaignEvents(campaign?.id);
  const { currentWorkspace } = useWorkspace();
  const updateCampaign = useUpdateCampaign();
  const sendCampaign = useSendCampaign();

  if (!campaign) return null;

  const stats = calculateCampaignStats(campaign);
  const isDraftOrReview = campaign.status === 'draft' || campaign.status === 'in_review';
  const canSend = campaign.status === 'ready_to_send' || campaign.status === 'draft';

  const handleEditorSave = async (design: EmailDesign, html: string) => {
    await updateCampaign.mutateAsync({
      id: campaign.id,
      bodyHtml: html,
      designJson: design as unknown as Record<string, unknown>,
    });
    setShowEditor(false);
  };

  const handleMarkReady = () => {
    updateCampaign.mutate({ id: campaign.id, status: 'ready_to_send' });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <DialogTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                {campaign.name}
              </DialogTitle>
              <Badge className={CAMPAIGN_STATUS_COLORS[campaign.status]}>
                {CAMPAIGN_STATUS_LABELS[campaign.status]}
              </Badge>
            </div>
            <DialogDescription>
              {campaign.subject}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue={isDraftOrReview ? 'send' : 'stats'} className="space-y-4">
            <TabsList className="flex w-max min-w-full">
              {(isDraftOrReview || campaign.status === 'ready_to_send') && (
                <TabsTrigger value="send">Envio</TabsTrigger>
              )}
              {campaign.status === 'sending' && (
                <TabsTrigger value="queue">Progresso</TabsTrigger>
              )}
              <TabsTrigger value="stats">Estatísticas</TabsTrigger>
              <TabsTrigger value="deliverability">Entregabilidade</TabsTrigger>
              <TabsTrigger value="clicks">Cliques</TabsTrigger>
              <TabsTrigger value="activity">Actividade</TabsTrigger>
              <TabsTrigger value="recipients">Destinatários</TabsTrigger>
              <TabsTrigger value="automation">Automação</TabsTrigger>
              <TabsTrigger value="content">Conteúdo</TabsTrigger>
            </TabsList>

            {/* Send Flow Tab */}
            {(isDraftOrReview || campaign.status === 'ready_to_send') && (
              <TabsContent value="send" className="space-y-4">
                {/* Approval workflow */}
                <CampaignApprovalPanel campaign={campaign} />

                {/* Preflight */}
                <CampaignPreflightDialog
                  campaign={campaign}
                  onMarkReady={handleMarkReady}
                  isUpdating={updateCampaign.isPending}
                />

                {/* Test send button */}
                <Card>
                  <CardContent className="pt-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Envio de Teste</p>
                      <p className="text-xs text-muted-foreground">
                        {campaign.testSentAt 
                          ? `Último teste: ${format(new Date(campaign.testSentAt), "d MMM yyyy HH:mm", { locale: pt })}`
                          : 'Nenhum teste enviado'}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setShowTestSend(true)}>
                      <FlaskConical className="h-4 w-4 mr-1" />
                      Enviar Teste
                    </Button>
                  </CardContent>
                </Card>

                {/* Validation + send (ready_to_send only) */}
                {campaign.status === 'ready_to_send' && (
                  <>
                    <CampaignValidationPanel
                      campaignId={campaign.id}
                      recipientCount={campaign.totalRecipients}
                      validationRunAt={campaign.validationRunAt}
                      validatedCount={campaign.validatedCount}
                      invalidCount={campaign.invalidCount}
                      suppressedCount={campaign.suppressedCount}
                      onValidated={() => {}}
                      onSend={() => sendCampaign.mutateAsync(campaign.id)}
                      isSending={sendCampaign.isPending}
                    />
                    <CampaignSendModeSelector
                      campaignId={campaign.id}
                      value={campaign.sendMode || 'immediate'}
                      recipientCount={campaign.totalRecipients}
                      onChange={(mode, config) => {
                        updateCampaign.mutate({
                          id: campaign.id,
                          sendMode: mode,
                          batchSize: config.batch_size,
                          batchIntervalMinutes: config.batch_interval_minutes,
                        });
                      }}
                    />
                  </>
                )}
              </TabsContent>
            )}

            {/* Queue Progress Tab */}
            {campaign.status === 'sending' && (
              <TabsContent value="queue" className="space-y-4">
                <CampaignQueueStatus
                  campaignId={campaign.id}
                  isPaused={campaign.sendPaused}
                  onPause={() => updateCampaign.mutate({ id: campaign.id, status: 'paused' })}
                  onResume={() => updateCampaign.mutate({ id: campaign.id, status: 'sending' })}
                />
              </TabsContent>
            )}

            <TabsContent value="stats" className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Send className="h-4 w-4" />
                      Enviados
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.sentCount}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Entregues
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.deliveredCount}</div>
                    <p className="text-xs text-muted-foreground">{stats.deliveryRate.toFixed(1)}% taxa de entrega</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Eye className="h-4 w-4 text-blue-500" />
                      Aberturas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.openedCount}</div>
                    <p className="text-xs text-muted-foreground">{stats.openRate.toFixed(1)}% taxa de abertura</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <MousePointer className="h-4 w-4 text-purple-500" />
                      Cliques
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.clickedCount}</div>
                    <p className="text-xs text-muted-foreground">{stats.clickRate.toFixed(1)}% taxa de cliques</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Funil de Conversão</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { label: 'Enviados', value: stats.sentCount, pct: 100 },
                    { label: 'Entregues', value: stats.deliveredCount, pct: stats.deliveryRate },
                    { label: 'Abertos', value: stats.openedCount, pct: stats.openRate },
                    { label: 'Clicados', value: stats.clickedCount, pct: stats.clickRate },
                  ].map(item => (
                    <div key={item.label} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{item.label}</span>
                        <span>{item.value} ({item.pct.toFixed(1)}%)</span>
                      </div>
                      <Progress value={item.pct} className="h-3" />
                    </div>
                  ))}
                </CardContent>
              </Card>

              {(stats.bouncedCount > 0 || stats.unsubscribedCount > 0) && (
                <Card className="border-amber-200">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2 text-amber-600">
                      <AlertTriangle className="h-4 w-4" />
                      Métricas Negativas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-3 gap-4">
                    <div>
                      <div className="text-xl font-bold text-red-600">{stats.bouncedCount}</div>
                      <p className="text-xs text-muted-foreground">Bounces ({stats.bounceRate.toFixed(1)}%)</p>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-orange-600">{stats.complainedCount}</div>
                      <p className="text-xs text-muted-foreground">Spam Reports</p>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-yellow-600">{stats.unsubscribedCount}</div>
                      <p className="text-xs text-muted-foreground">Unsubscribes ({stats.unsubscribeRate.toFixed(1)}%)</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="deliverability" className="space-y-4">
              <DeliverabilityPanel
                campaignId={campaign.id}
                sentCount={campaign.sentCount}
                deliveredCount={campaign.deliveredCount}
                openedCount={campaign.openedCount}
                clickedCount={campaign.clickedCount}
                bouncedCount={campaign.bouncedCount}
                complainedCount={campaign.complainedCount}
                unsubscribedCount={campaign.unsubscribedCount}
              />
            </TabsContent>

            <TabsContent value="clicks" className="space-y-4">
              <ClickHeatmapPanel
                campaignId={campaign.id}
                workspaceId={currentWorkspace?.id || ''}
                htmlContent={campaign.bodyHtml}
              />
            </TabsContent>

            <TabsContent value="activity" className="space-y-4">
              <ActivityFeed
                campaignId={campaign.id}
                workspaceId={currentWorkspace?.id || ''}
              />
            </TabsContent>

            <TabsContent value="recipients" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Destinatários ({recipients.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {recipients.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Ainda não há destinatários
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {recipients.map((recipient: any) => (
                        <div
                          key={recipient.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div>
                            <p className="font-medium">{recipient.name || recipient.email}</p>
                            <p className="text-sm text-muted-foreground">{recipient.email}</p>
                          </div>
                          <Badge variant="outline">
                            {RECIPIENT_STATUS_LABELS[recipient.status as keyof typeof RECIPIENT_STATUS_LABELS] || recipient.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="automation" className="space-y-4">
              <TriggerBuilder campaignId={campaign.id} />
            </TabsContent>

            <TabsContent value="content" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Preview do Email
                    </CardTitle>
                    {campaign.designJson && isDraftOrReview && (
                      <Button variant="outline" size="sm" onClick={() => setShowEditor(true)}>
                        <Pencil className="h-4 w-4 mr-1" />
                        Editar no Editor Visual
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg p-4 bg-white">
                    <div className="mb-4 pb-4 border-b">
                      <p className="text-sm">
                        <strong>De:</strong> {campaign.fromName}
                      </p>
                      <p className="text-sm">
                        <strong>Assunto:</strong> {campaign.subject}
                      </p>
                      {campaign.previewText && (
                        <p className="text-sm text-muted-foreground">
                          {campaign.previewText}
                        </p>
                      )}
                    </div>
                    <div
                      className="email-preview"
                      dangerouslySetInnerHTML={{ __html: campaign.bodyHtml }}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Test Send Dialog */}
      <CampaignTestSendDialog
        open={showTestSend}
        onOpenChange={setShowTestSend}
        campaignId={campaign.id}
      />

      {/* Email Builder Dialog for re-editing */}
      {showEditor && campaign.designJson && (
        <EmailBuilderDialog
          open={showEditor}
          onOpenChange={setShowEditor}
          initialDesign={campaign.designJson as unknown as EmailDesign}
          onSave={handleEditorSave}
        />
      )}
    </>
  );
}
