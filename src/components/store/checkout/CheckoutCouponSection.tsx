import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Ticket, X } from "lucide-react";

interface CheckoutCouponSectionProps {
  couponCode: string;
  onCouponCodeChange: (code: string) => void;
  appliedCoupon: { code: string; discount_type: string; discount_value: number } | null;
  onApply: () => void;
  onRemove: () => void;
  couponLoading: boolean;
}

export function CheckoutCouponSection({
  couponCode,
  onCouponCodeChange,
  appliedCoupon,
  onApply,
  onRemove,
  couponLoading,
}: CheckoutCouponSectionProps) {
  if (appliedCoupon) {
    return (
      <div className="flex items-center justify-between bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2">
        <div className="flex items-center gap-2">
          <Ticket className="h-4 w-4 text-green-600" />
          <span className="text-sm font-medium text-green-700 dark:text-green-400">{appliedCoupon.code}</span>
          <Badge variant="secondary" className="text-xs">
            -{appliedCoupon.discount_type === "percentage" ? `${appliedCoupon.discount_value}%` : `€${appliedCoupon.discount_value.toFixed(2)}`}
          </Badge>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onRemove}>
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Input
        placeholder="Código de cupão"
        value={couponCode}
        onChange={(e) => onCouponCodeChange(e.target.value.toUpperCase())}
        className="text-sm"
      />
      <Button variant="outline" size="sm" onClick={onApply} disabled={couponLoading || !couponCode.trim()}>
        Aplicar
      </Button>
    </div>
  );
}
