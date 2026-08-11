import type { ReactNode } from "react";
import { Check, Lock, ShoppingBag, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StoreVatLabel } from "@/components/store/StoreVatLabel";
import { cn } from "@/lib/utils";

interface PurchaseModeChooserProps {
  price: number;
  disabled?: boolean;
  onAddToCart: () => void;
  /** Diálogo de proposta de preço; quando ausente o cartão de oferta não aparece. */
  offerSlot?: ReactNode;
  directBullets: string[];
  offerBullets?: string[];
}

/** Passo 1: escolher entre compra direta e propor um preço. */
export function PurchaseModeChooser({
  price,
  disabled,
  onAddToCart,
  offerSlot,
  directBullets,
  offerBullets = [
    "Propõe o teu preço à loja",
    "Sem compromisso até aceitação",
    "Resposta por email",
  ],
}: PurchaseModeChooserProps) {
  const hasOffer = !!offerSlot;

  return (
    <div className="@container/modes">
      <div className={cn("grid gap-3", hasOffer && "@[420px]/modes:grid-cols-2")}>
      <div className="relative rounded-2xl border border-primary/40 bg-primary/[0.03] p-4">

        {hasOffer && (
          <Badge className="absolute -top-2 left-4 border-0 bg-primary text-primary-foreground text-[10px]">
            Melhor opção
          </Badge>
        )}
        <div className="mb-2 flex items-center gap-2">
          <Lock className="h-4 w-4 text-primary" aria-hidden="true" />
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Compra segura
          </span>
        </div>
        <p className="font-semibold">Comprar agora</p>
        <p className="mt-1 flex flex-wrap items-baseline gap-x-1.5 text-2xl font-bold text-primary">
          <span>€{price.toFixed(2)}</span> <StoreVatLabel />
        </p>
        <ul className="mt-3 space-y-1.5">
          {directBullets.map((b) => (
            <li key={b} className="flex items-start gap-2 text-xs text-muted-foreground">
              <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" aria-hidden="true" />
              <span className="min-w-0">{b}</span>
            </li>
          ))}
        </ul>
        <Button
          className="mt-4 h-auto min-h-11 w-full gap-2 whitespace-normal rounded-xl px-3 py-2 text-sm leading-tight"
          onClick={onAddToCart}
          disabled={disabled}
        >
          <ShoppingBag className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <span className="min-w-0">Adicionar ao carrinho</span>
        </Button>
      </div>

      {hasOffer && (
        <div className="rounded-2xl border p-4">
          <div className="mb-2 flex items-center gap-2">
            <Tag className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Negociar
            </span>
          </div>
          <p className="font-semibold">Fazer uma oferta</p>
          <p className="mt-1 text-2xl font-bold text-muted-foreground line-through">
            €{price.toFixed(2)}
          </p>
          <ul className="mt-3 space-y-1.5">
            {offerBullets.map((b) => (
              <li key={b} className="flex items-start gap-2 text-xs text-muted-foreground">
                <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" aria-hidden="true" />
                <span className="min-w-0">{b}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 [&_button]:h-auto [&_button]:min-h-11 [&_button]:w-full [&_button]:whitespace-normal [&_button]:rounded-xl [&_button]:px-3 [&_button]:py-2 [&_button]:leading-tight">
            {offerSlot}
          </div>
        </div>
      )}
    </div>
  );
}
