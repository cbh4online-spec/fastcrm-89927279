import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, AlertTriangle, XCircle, Shield, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  campaignId: string;
  recipientCount: number;
  validationData?: {
    validated_count: number;
    invalid_count: number;
    suppression_count: number;
    validation_run_at: string;
  };
  onValidated?: () => void;
}

export function ValidationPanel({ campaignId, recipientCount, validationData, onValidated }: Props) {
  const [isValidating, setIsValidating] = useState(false);
  const [results, setResults] = useState<{
    total: number;
    valid: number;
    invalid: number;
    suppressed: number;
    reasons: Array<{ email: string; reason: string }>;
  } | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const hasRun = !!validationData?.validation_run_at || !!results;

  const handleValidate = async () => {
    setIsValidating(true);
    try {
      const { data, error } = await supabase.functions.invoke('email-validate-list', {
        body: { campaign_id: campaignId },
      });
      if (error) throw error;
      setResults(data);
      onValidated?.();
      toast.success('Validação concluída');
    } catch (e: any) {
      toast.error(e.message || 'Erro na validação');
    } finally {
      setIsValidating(false);
    }
  };

  const valid = results?.valid ?? validationData?.validated_count ?? 0;
  const invalid = results?.invalid ?? validationData?.invalid_count ?? 0;
  const suppressed = results?.suppressed ?? validationData?.suppression_count ?? 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          Validação da Lista
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasRun ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Lista por validar — <strong>{recipientCount}</strong> destinatários
            </p>
            <Button onClick={handleValidate} disabled={isValidating} className="w-full">
              {isValidating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  A validar...
                </>
              ) : (
                'Validar agora'
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {valid > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="text-emerald-700 dark:text-emerald-400">
                  {valid} emails válidos prontos a enviar
                </span>
              </div>
            )}
            {invalid > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span className="text-amber-700 dark:text-amber-400">
                  {invalid} emails inválidos removidos
                </span>
              </div>
            )}
            {suppressed > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <XCircle className="h-4 w-4 text-red-500" />
                <span className="text-red-700 dark:text-red-400">
                  {suppressed} endereços na lista de supressão
                </span>
              </div>
            )}

            {valid + invalid + suppressed > 0 && (
              <Progress value={(valid / (valid + invalid + suppressed)) * 100} className="h-2" />
            )}

            {results?.reasons && results.reasons.length > 0 && (
              <div>
                <Button variant="ghost" size="sm" onClick={() => setShowDetails(!showDetails)}>
                  {showDetails ? 'Ocultar detalhes' : 'Ver detalhes'}
                </Button>
                {showDetails && (
                  <div className="mt-2 max-h-48 overflow-auto border rounded-md">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="p-2 text-left">Email</th>
                          <th className="p-2 text-left">Razão</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.reasons.map((r, i) => (
                          <tr key={i} className="border-t">
                            <td className="p-2 font-mono">{r.email}</td>
                            <td className="p-2">{r.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            <Button variant="outline" size="sm" onClick={handleValidate} disabled={isValidating}>
              {isValidating ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
              Re-validar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
