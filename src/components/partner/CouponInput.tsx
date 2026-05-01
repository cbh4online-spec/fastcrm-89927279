import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tag, X, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { formatMoneyEur } from "@/lib/money";
import type { PartnerCartTotals } from "@/hooks/partner/usePartnerCartTotals";

interface Props {
  couponCode: string | null;
  onApply: (code: string) => void;
  onRemove: () => void;
  totals: PartnerCartTotals;
  loading?: boolean;
}

const REASON_MESSAGES: Record<string, string> = {
  not_found: 'Cupão inexistente',
  not_yet_active: 'Cupão ainda não ativo',
  expired: 'Cupão expirado',
  max_uses_reached: 'Cupão esgotado',
  min_subtotal_not_met: 'Subtotal mínimo não atingido',
  tier_mismatch: 'Cupão não disponível para o seu tier',
  per_partner_limit_reached: 'Limite de utilizações atingido',
  not_first_order: 'Cupão apenas para a primeira encomenda',
};

export function CouponInput({ couponCode, onApply, onRemove, totals, loading }: Props) {
  const [input, setInput] = useState("");

  const isApplied = !!couponCode && totals.coupon?.valid;
  const isInvalid = !!couponCode && totals.coupon && !totals.coupon.valid;

  if (isApplied) {
    return (
      <div className="rounded-md border bg-emerald-50 dark:bg-emerald-950/20 p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <Badge variant="outline" className="font-mono">{totals.coupon?.code}</Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={onRemove} className="h-7 px-2">
            <X className="h-3 w-3" />
          </Button>
        </div>
        {totals.coupon?.description && (
          <p className="text-xs text-muted-foreground">{totals.coupon.description}</p>
        )}
        <div className="flex justify-between text-sm font-medium text-emerald-700">
          <span>Poupança</span>
          <span>−{formatMoneyEur(totals.coupon_savings)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Tag className="h-4 w-4" />
        Cupão de desconto
      </div>
      <div className="flex gap-2">
        <Input
          placeholder="CÓDIGO"
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          className="font-mono uppercase"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && input.trim()) onApply(input.trim());
          }}
        />
        <Button
          variant="outline"
          onClick={() => input.trim() && onApply(input.trim())}
          disabled={!input.trim() || loading}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Aplicar'}
        </Button>
      </div>
      {isInvalid && totals.coupon?.reason && (
        <div className="flex items-start gap-1.5 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>{REASON_MESSAGES[totals.coupon.reason] || 'Cupão inválido'}</span>
        </div>
      )}
    </div>
  );
}
