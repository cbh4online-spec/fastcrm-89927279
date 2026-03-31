import { useMemo } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { runCampaignPreflight } from '@/utils/campaignPreflight';
import type { MarketingCampaign } from '@/types/marketing';

interface CampaignPreflightDialogProps {
  campaign: MarketingCampaign;
  onMarkReady?: () => void;
  isUpdating?: boolean;
}

export function CampaignPreflightDialog({ campaign, onMarkReady, isUpdating }: CampaignPreflightDialogProps) {
  const result = useMemo(() => runCampaignPreflight(campaign), [campaign]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Preflight — Pronto para Enviar?
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{result.score}%</span>
            <Progress value={result.score} className="w-24 h-2" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {result.checks.map((check) => (
          <div key={check.id} className="flex items-start gap-2 text-sm">
            {check.passed ? (
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
            ) : check.severity === 'error' ? (
              <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            )}
            <div className="flex-1">
              <span className={check.passed ? 'text-muted-foreground' : ''}>
                {check.label}
              </span>
              {!check.passed && check.detail && (
                <p className="text-xs text-muted-foreground mt-0.5">{check.detail}</p>
              )}
            </div>
            {!check.passed && (
              <Badge variant="outline" className={
                check.severity === 'error' 
                  ? 'text-red-600 border-red-200' 
                  : 'text-amber-600 border-amber-200'
              }>
                {check.severity === 'error' ? 'Bloqueante' : 'Aviso'}
              </Badge>
            )}
          </div>
        ))}

        {result.canSend && campaign.status === 'draft' && onMarkReady && (
          <div className="pt-3 border-t">
            <Button
              onClick={onMarkReady}
              disabled={isUpdating}
              className="w-full"
            >
              Marcar como Pronta para Envio
            </Button>
          </div>
        )}

        {!result.canSend && (
          <div className="pt-3 border-t">
            <p className="text-sm text-red-600 flex items-center gap-1">
              <XCircle className="h-4 w-4" />
              {result.errors.length} erro(s) bloqueante(s) — corrija antes de enviar
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
