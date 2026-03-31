import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  CheckCircle, 
  XCircle, 
  Send, 
  ClipboardCheck,
  ArrowRight,
  MessageSquare,
} from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { useUpdateCampaign } from '@/hooks/useMarketingCampaigns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { MarketingCampaign, CampaignStatus } from '@/types/marketing';
import { CAMPAIGN_STATUS_LABELS, CAMPAIGN_STATUS_COLORS } from '@/types/marketing';

interface CampaignApprovalPanelProps {
  campaign: MarketingCampaign;
}

export function CampaignApprovalPanel({ campaign }: CampaignApprovalPanelProps) {
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const updateCampaign = useUpdateCampaign();

  const handleTransition = async (newStatus: CampaignStatus, extras?: Record<string, any>) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      const userId = user.user?.id;
      const now = new Date().toISOString();

      const updateData: any = { id: campaign.id, status: newStatus, ...extras };

      if (newStatus === 'in_review') {
        updateData.reviewedAt = now;
        updateData.reviewedBy = userId;
        updateData.rejectionReason = null;
      }
      if (newStatus === 'ready_to_send') {
        updateData.approvedAt = now;
        updateData.approvedBy = userId;
      }

      await updateCampaign.mutateAsync(updateData);
      toast.success(`Estado alterado para ${CAMPAIGN_STATUS_LABELS[newStatus]}`);
      setShowRejectForm(false);
    } catch {
      toast.error('Erro ao alterar estado');
    }
  };

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      toast.error('Indique o motivo da rejeição');
      return;
    }
    handleTransition('draft', { rejectionReason: rejectionReason.trim() });
    setRejectionReason('');
  };

  const steps: { status: CampaignStatus; label: string }[] = [
    { status: 'draft', label: 'Rascunho' },
    { status: 'in_review', label: 'Em Revisão' },
    { status: 'ready_to_send', label: 'Pronta' },
  ];

  const currentIdx = steps.findIndex(s => s.status === campaign.status);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4" />
          Workflow Editorial
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar */}
        <div className="flex items-center gap-1">
          {steps.map((step, i) => {
            const isActive = step.status === campaign.status;
            const isPast = currentIdx > i;
            return (
              <div key={step.status} className="flex items-center gap-1 flex-1">
                <div className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full flex-1 justify-center ${
                  isActive ? 'bg-primary text-primary-foreground' :
                  isPast ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                }`}>
                  {isPast && <CheckCircle className="h-3 w-3" />}
                  {step.label}
                </div>
                {i < steps.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />}
              </div>
            );
          })}
        </div>

        {/* Rejection reason display */}
        {campaign.rejectionReason && campaign.status === 'draft' && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950 text-sm">
            <MessageSquare className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-red-700 dark:text-red-300">Rejeitada</p>
              <p className="text-red-600 dark:text-red-400">{campaign.rejectionReason}</p>
            </div>
          </div>
        )}

        {/* Approval info */}
        {campaign.approvedAt && (
          <p className="text-xs text-muted-foreground">
            Aprovada em {format(new Date(campaign.approvedAt), "d MMM yyyy 'às' HH:mm", { locale: pt })}
          </p>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          {campaign.status === 'draft' && (
            <Button
              size="sm"
              onClick={() => handleTransition('in_review')}
              disabled={updateCampaign.isPending}
            >
              <Send className="h-4 w-4 mr-1" />
              Submeter para Revisão
            </Button>
          )}

          {campaign.status === 'in_review' && (
            <>
              <Button
                size="sm"
                onClick={() => handleTransition('ready_to_send')}
                disabled={updateCampaign.isPending}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Aprovar
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setShowRejectForm(!showRejectForm)}
                disabled={updateCampaign.isPending}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Rejeitar
              </Button>
            </>
          )}

          {campaign.status === 'ready_to_send' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleTransition('draft')}
              disabled={updateCampaign.isPending}
            >
              Voltar a Rascunho
            </Button>
          )}
        </div>

        {/* Reject form */}
        {showRejectForm && (
          <div className="space-y-2 pt-2 border-t">
            <Textarea
              placeholder="Motivo da rejeição..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
            />
            <Button size="sm" variant="destructive" onClick={handleReject} disabled={updateCampaign.isPending}>
              Confirmar Rejeição
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
