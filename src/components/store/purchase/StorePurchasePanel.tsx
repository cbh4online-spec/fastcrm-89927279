import type { ReactNode } from "react";
import { PurchaseModeChooser } from "./PurchaseModeChooser";
import { BundleTierSelector } from "./BundleTierSelector";
import { SellerContactBlock } from "./SellerContactBlock";
import {
  StoreCheaperAlternatives,
  useStoreCheaperAlternatives,
} from "@/components/store/sections/StoreCheaperAlternatives";
import { useStorePurchaseTiers, type TierProduct } from "./useStorePurchaseTiers";
import type { ProductPageConfig } from "@/lib/store/productPageConfig";


interface StorePurchasePanelProps {
  productId: string;
  productName: string;
  workspaceId: string;
  workspaceSlug: string;
  categoryId: string | null;
  price: number;
  disabled?: boolean;
  onAddToCart: () => void;
  offerSlot?: ReactNode;
  currentProduct: TierProduct | null;
  config: ProductPageConfig;
  storeName?: string | null;
  contactEmail?: string | null;
  directBullets: string[];
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
          {n}
        </span>
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h3>
      </div>
      {children}
    </section>
  );
}

/** Painel de decisão da ficha de produto: como comprar, quanto levar, alternativas e contacto. */
export function StorePurchasePanel({
  productId,
  productName,
  workspaceId,
  workspaceSlug,
  categoryId,
  price,
  disabled,
  onAddToCart,
  offerSlot,
  currentProduct,
  config,
  storeName,
  contactEmail,
  directBullets,
}: StorePurchasePanelProps) {
  // Só mostramos um passo quando há mesmo conteúdo para ele — evita cabeçalhos vazios.
  const { data: tiers = [] } = useStorePurchaseTiers({
    productId,
    workspaceId,
    currentProduct,
    enabled: config.bundles_enabled,
  });
  const { data: alternatives = [] } = useStoreCheaperAlternatives({
    productId,
    categoryId,
    workspaceId,
    currentPrice: config.cheaper_alternatives_enabled ? price : 0,
  });

  const showBundles = config.bundles_enabled && tiers.length >= 2;
  const showAlternatives = config.cheaper_alternatives_enabled && alternatives.length > 0;

  let step = 0;

  return (
    <div className="space-y-5">
      {config.purchase_modes_enabled ? (
        <Step n={++step} title="Como queres comprar">
          <PurchaseModeChooser
            price={price}
            disabled={disabled}
            onAddToCart={onAddToCart}
            offerSlot={offerSlot}
            directBullets={directBullets}
          />
        </Step>
      ) : null}

      {showBundles && (
        <Step n={++step} title="Leva mais desta loja">
          <BundleTierSelector
            productId={productId}
            workspaceId={workspaceId}
            currentProduct={currentProduct}
          />
        </Step>
      )}

      {showAlternatives && (
        <Step n={++step} title="Alternativas mais acessíveis">
          <StoreCheaperAlternatives
            productId={productId}
            categoryId={categoryId}
            workspaceId={workspaceId}
            workspaceSlug={workspaceSlug}
            currentPrice={price}
            compact
          />
        </Step>
      )}


      {config.seller_contact_enabled && contactEmail && (
        <Step n={++step} title="Fala com a loja">
          <SellerContactBlock
            storeName={storeName}
            email={contactEmail}
            productName={productName}
          />
        </Step>
      )}
    </div>
  );
}
