import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ShieldCheck,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Loader2,
  ChevronDown,
  ChevronUp,
  Send,
  ArrowRight,
} from 'lucide-react';
import { useCampaignValidation } from '@/hooks/useCampaignValidation';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';

interface CampaignValidationPanelProps {
  campaignId: string;
  recipientCount: number;
  validationRunAt?: string | null;
  validatedCount?: number;
  invalidCount?: number;
  suppressedCount?: number;
  onValidated?: () => void;
  onSend?: () => void;
  isSending?: boolean;
}

export function CampaignValidationPanel({
  campaignId,
  recipientCount,
  validationRunAt,
  validatedCount = 0,
  invalidCount = 0,
  suppressedCount = 0,
  onValidated,
  onSend,
  isSending,
}: CampaignValidationPanelProps) {
  const { validate, isValidating } = useCampaignValidation(campaignId);
  const [showInvalidEmails, setShowInvalidEmails] = useState(false);

  const isValidated = !!validationRunAt;
  const validRecipients = validatedCount;
  const excludedCount = invalidCount + suppressedCount;

  // Fetch invalid/suppressed emails for the details table
  const { data: invalidEmails = [] } = useQuery({
    queryKey: ['campaign-invalid-emails', campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_recipients')
        .select('email, validation_status, validation_reason')
        .eq('campaign_id', campaignId)
        .neq('validation_status', 'valid')
        .neq('validation_status', 'unchecked')
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: isValidated && showInvalidEmails,
  });

  const handleValidate = async () => {
    try {
      await validate.mutateAsync();
      onValidated?.();
    } catch {
      // error handled by mutation
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Validação de Lista
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* STATE B — Validating */}
        {isValidating ? (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/40 p-6 text-center animate-pulse">
              <Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin text-primary" />
              <p className="font-medium text-sm">
                A validar {recipientCount} endereços...
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                A verificar sintaxe e registos MX...
              </p>
            </div>
            <p className="text-xs text-center text-muted-foreground">
              Não é possível enviar durante a validação
            </p>
          </div>
        ) : !isValidated ? (
          /* STATE A — Not yet validated */
          <>
            <div className="rounded-lg border border-dashed p-4 text-center">
              <ShieldCheck className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">Lista por validar</p>
              <p className="text-xs text-muted-foreground mt-1">
                {recipientCount} destinatários aguardam verificação
              </p>
            </div>
            <Button onClick={handleValidate} className="w-full">
              <ShieldCheck className="h-4 w-4 mr-2" />
              Validar agora
            </Button>
          </>
        ) : (
          /* STATE C — Validated, results shown */
          <div className="space-y-4">
            {/* Metric cards */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border bg-emerald-500/10 p-3 text-center">
                <CheckCircle2 className="h-4 w-4 mx-auto mb-1 text-emerald-600" />
                <p className="text-lg font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                  {validRecipients}
                </p>
                <p className="text-[10px] text-muted-foreground">Válidos</p>
              </div>
              <div className="rounded-lg border bg-destructive/10 p-3 text-center">
                <AlertTriangle className="h-4 w-4 mx-auto mb-1 text-destructive" />
                <p className="text-lg font-bold tabular-nums text-destructive">
                  {invalidCount}
                </p>
                <p className="text-[10px] text-muted-foreground">Inválidos</p>
              </div>
              <div className="rounded-lg border bg-amber-500/10 p-3 text-center">
                <XCircle className="h-4 w-4 mx-auto mb-1 text-amber-600" />
                <p className="text-lg font-bold tabular-nums text-amber-700 dark:text-amber-400">
                  {suppressedCount}
                </p>
                <p className="text-[10px] text-muted-foreground">Suprimidos</p>
              </div>
            </div>

            {/* Amber warning if exclusions exist */}
            {excludedCount > 0 && (
              <div className="flex items-center gap-2 rounded-md bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{excludedCount} endereços serão ignorados no envio</span>
              </div>
            )}

            {/* Expandable invalid emails table */}
            {excludedCount > 0 && (
              <div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowInvalidEmails(!showInvalidEmails)}
                  className="text-xs px-0 h-auto py-1 text-muted-foreground hover:text-foreground"
                >
                  {showInvalidEmails ? (
                    <ChevronUp className="h-3 w-3 mr-1" />
                  ) : (
                    <ChevronDown className="h-3 w-3 mr-1" />
                  )}
                  Ver emails inválidos
                </Button>

                {showInvalidEmails && (
                  <div className="mt-2 rounded-md border overflow-hidden">
                    <div className="max-h-64 overflow-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/50 sticky top-0">
                          <tr>
                            <th className="text-left p-2 font-medium">Email</th>
                            <th className="text-left p-2 font-medium">Motivo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {invalidEmails.map((item, i) => (
                            <tr key={i} className="border-t">
                              <td className="p-2 font-mono truncate max-w-[200px]">
                                {item.email}
                              </td>
                              <td className="p-2 text-muted-foreground">
                                {item.validation_reason || item.validation_status}
                              </td>
                            </tr>
                          ))}
                          {invalidEmails.length === 0 && (
                            <tr>
                              <td colSpan={2} className="p-3 text-center text-muted-foreground">
                                A carregar...
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    {invalidEmails.length >= 50 && (
                      <div className="border-t p-2 bg-muted/30 text-center">
                        <Link
                          to="/dashboard/email-campaigns/suppressions"
                          className="text-xs text-primary hover:underline"
                        >
                          Ver todos →
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Actions row */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={handleValidate}
                className="text-xs"
              >
                Re-validar lista
              </Button>
              {validationRunAt && (
                <span className="text-[10px] text-muted-foreground">
                  Validado:{' '}
                  {new Date(validationRunAt).toLocaleString('pt-PT', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              )}
            </div>

            {/* Send button */}
            <Button
              className="w-full"
              size="lg"
              disabled={validRecipients === 0 || isSending}
              onClick={onSend}
            >
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  A enviar...
                </>
              ) : (
                <>
                  Continuar para envio
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        )}

        {!isValidated && !isValidating && (
          <p className="text-xs text-center text-muted-foreground">
            Valide a lista antes de enviar
          </p>
        )}
      </CardContent>
    </Card>
  );
}
