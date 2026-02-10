import { useState } from "react";
import { validateGiftCard } from "@/hooks/useStoreGiftCards";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Gift, Loader2, CheckCircle2, X } from "lucide-react";

interface StoreGiftCardBalanceProps {
  workspaceId: string;
  onApply?: (giftCard: { id: string; code: string; current_balance: number }) => void;
  appliedGiftCard?: { id: string; code: string; current_balance: number } | null;
  onRemove?: () => void;
}

export function StoreGiftCardBalance({ workspaceId, onApply, appliedGiftCard, onRemove }: StoreGiftCardBalanceProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleApply = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError("");
    try {
      const gc = await validateGiftCard(code, workspaceId);
      if (!gc) {
        setError("Gift Card inválido, expirado ou sem saldo");
        return;
      }
      onApply?.({ id: gc.id, code: gc.code, current_balance: gc.current_balance });
      setCode("");
    } finally {
      setLoading(false);
    }
  };

  if (appliedGiftCard) {
    return (
      <div className="flex items-center justify-between bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg px-3 py-2">
        <div className="flex items-center gap-2">
          <Gift className="h-4 w-4 text-purple-600" />
          <span className="text-sm font-medium text-purple-700 dark:text-purple-400 font-mono">{appliedGiftCard.code}</span>
          <span className="text-xs text-purple-600">Saldo: €{appliedGiftCard.current_balance.toFixed(2)}</span>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onRemove}>
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <Input
          placeholder="Código Gift Card"
          value={code}
          onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(""); }}
          className="text-sm font-mono"
        />
        <Button variant="outline" size="sm" onClick={handleApply} disabled={loading || !code.trim()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aplicar"}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
