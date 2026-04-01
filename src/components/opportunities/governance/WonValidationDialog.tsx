import { useTranslation } from "react-i18next";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { Opportunity } from "@/types/opportunity";

interface WonValidationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opportunity: Opportunity | null;
  onConfirm: () => void;
}

interface ValidationCheck {
  key: string;
  label: string;
  passed: boolean;
}

export function WonValidationDialog({ open, onOpenChange, opportunity, onConfirm }: WonValidationDialogProps) {
  const { t } = useTranslation('crm');

  if (!opportunity) return null;

  const checks: ValidationCheck[] = [
    {
      key: "owner",
      label: t('wonCheck_owner', 'Responsável atribuído'),
      passed: !!opportunity.owner_id,
    },
    {
      key: "value",
      label: t('wonCheck_value', 'Valor superior a 0'),
      passed: !!opportunity.value && Number(opportunity.value) > 0,
    },
    {
      key: "account",
      label: t('wonCheck_account', 'Contacto ou empresa associado'),
      passed: !!opportunity.contact_id || !!opportunity.company_id,
    },
  ];

  const allPassed = checks.every((c) => c.passed);
  const failedChecks = checks.filter((c) => !c.passed);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            {t('markAsWon', 'Marcar como Ganha')}
          </DialogTitle>
          <DialogDescription>
            {t('wonValidationDesc', 'Validação mínima para fechar "{{title}}" como ganha.', { title: opportunity.title })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {checks.map((check) => (
            <div key={check.key} className="flex items-center gap-3 py-1.5">
              {check.passed ? (
                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
              )}
              <span className="text-sm">{check.label}</span>
              <Badge variant={check.passed ? "default" : "destructive"} className="ml-auto text-[10px]">
                {check.passed ? t('pass', 'OK') : t('fail', 'Falha')}
              </Badge>
            </div>
          ))}
        </div>

        {!allPassed && (
          <p className="text-xs text-amber-600 mt-2">
            {t('wonValidationWarning', 'Existem {{count}} validação(ões) em falha. Pode continuar, mas recomendamos corrigir antes.', { count: failedChecks.length })}
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel', 'Cancelar')}
          </Button>
          <Button onClick={onConfirm} className="bg-green-600 hover:bg-green-700 text-white">
            {allPassed
              ? t('confirmWon', 'Confirmar Ganho')
              : t('confirmWonAnyway', 'Confirmar Mesmo Assim')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
