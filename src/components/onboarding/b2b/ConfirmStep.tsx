import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Check, Crown, Loader2 } from "lucide-react";
import type { B2BDetails } from "./B2BDetailsForm";

interface Props {
  details: B2BDetails;
  onBack: () => void;
  onConfirm: () => void;
  submitting: boolean;
}

export function ConfirmStep({ details, onBack, onConfirm, submitting }: Props) {
  const rows: Array<[string, string | undefined]> = [
    ["Organização", details.name],
    ["Designação legal", details.company_name || undefined],
    ["NIF", details.tax_id || undefined],
    ["Setor", details.business_type || undefined],
    ["Dimensão", details.team_size || undefined],
    ["Objetivo", details.primary_objective || undefined],
    ["O meu cargo", details.my_title || undefined],
  ].filter(([, v]) => !!v) as Array<[string, string]>;

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-lg border border-primary/40 bg-primary/5 flex items-start gap-3">
        <Crown className="w-5 h-5 text-primary mt-0.5" />
        <div>
          <div className="font-medium text-foreground">Vais ser o <span className="text-primary">Owner</span> desta organização</div>
          <p className="text-sm text-muted-foreground mt-1">
            Acesso total: faturação, equipa, integrações e configurações. Podes convidar colegas a seguir.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-border divide-y divide-border bg-card">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-4 p-3 text-sm">
            <span className="text-muted-foreground">{k}</span>
            <span className="font-medium text-foreground text-right truncate">{v}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="ghost" onClick={onBack} disabled={submitting}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>
        <Button type="button" onClick={onConfirm} disabled={submitting}>
          {submitting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
          Criar e entrar
        </Button>
      </div>
    </div>
  );
}
