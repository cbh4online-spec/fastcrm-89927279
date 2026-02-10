import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tag, X, Clock, Copy, Check } from "lucide-react";
import { usePublicActiveCoupons, type PublicCoupon } from "@/hooks/usePublicActiveCoupons";
import { toast } from "sonner";

interface StoreCouponBannerProps {
  workspaceId: string;
}

function CountdownTimer({ targetDate }: { targetDate: string }) {
  const [timeLeft, setTimeLeft] = useState(() => calcTimeLeft(targetDate));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calcTimeLeft(targetDate));
    }, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  if (timeLeft.total <= 0) return null;

  return (
    <div className="flex items-center gap-1 text-xs font-mono">
      <Clock className="h-3 w-3" />
      {timeLeft.days > 0 && <span>{timeLeft.days}d</span>}
      <span>{String(timeLeft.hours).padStart(2, "0")}h</span>
      <span>{String(timeLeft.minutes).padStart(2, "0")}m</span>
      <span>{String(timeLeft.seconds).padStart(2, "0")}s</span>
    </div>
  );
}

function calcTimeLeft(target: string) {
  const diff = new Date(target).getTime() - Date.now();
  if (diff <= 0) return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
  return {
    total: diff,
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

function CouponSlide({ coupon, onDismiss }: { coupon: PublicCoupon; onDismiss: () => void }) {
  const [copied, setCopied] = useState(false);

  const discountLabel = coupon.discount_type === "percentage"
    ? `${coupon.discount_value}% OFF`
    : `€${coupon.discount_value.toFixed(2)} OFF`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(coupon.code);
      setCopied(true);
      toast.success(`Código ${coupon.code} copiado!`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  return (
    <div className="relative bg-gradient-to-r from-primary to-primary/80 text-primary-foreground py-2.5 px-4">
      <div className="container mx-auto flex items-center justify-center gap-3 flex-wrap text-sm">
        <Tag className="h-4 w-4 shrink-0" />
        <span className="font-bold">{discountLabel}</span>
        <span className="hidden sm:inline">com o código</span>
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1 bg-white/20 hover:bg-white/30 transition-colors px-2.5 py-0.5 rounded font-mono font-bold text-xs tracking-wider cursor-pointer"
        >
          {coupon.code}
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        </button>
        {coupon.min_order_amount > 0 && (
          <span className="text-xs opacity-80">
            (mín. €{coupon.min_order_amount.toFixed(2)})
          </span>
        )}
        {coupon.valid_until && (
          <CountdownTimer targetDate={coupon.valid_until} />
        )}
      </div>
      <button
        onClick={onDismiss}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-white/20 rounded transition-colors"
        aria-label="Fechar"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function StoreCouponBanner({ workspaceId }: StoreCouponBannerProps) {
  const { data: coupons = [] } = usePublicActiveCoupons(workspaceId);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);

  const visibleCoupons = useMemo(
    () => coupons.filter(c => !dismissed.has(c.id)),
    [coupons, dismissed]
  );

  // Auto-rotate if multiple coupons
  useEffect(() => {
    if (visibleCoupons.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex(i => (i + 1) % visibleCoupons.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [visibleCoupons.length]);

  // Reset index if out of bounds
  useEffect(() => {
    if (currentIndex >= visibleCoupons.length) {
      setCurrentIndex(0);
    }
  }, [currentIndex, visibleCoupons.length]);

  if (visibleCoupons.length === 0) return null;

  const activeCoupon = visibleCoupons[currentIndex] || visibleCoupons[0];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeCoupon.id}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
      >
        <CouponSlide
          coupon={activeCoupon}
          onDismiss={() => setDismissed(prev => new Set(prev).add(activeCoupon.id))}
        />
      </motion.div>
    </AnimatePresence>
  );
}
