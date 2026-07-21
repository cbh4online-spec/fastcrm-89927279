import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStoreCart } from "@/contexts/StoreCartContext";
import { trackAddToCart } from "@/lib/ecommerceTracking";
import { trackEvent } from "@/lib/analytics";
import type { ConversionGoal, OfferPageConfig } from "./offerPageTypes";

interface UseOfferConversionArgs {
  config: OfferPageConfig;
  product: any;
  workspaceSlug: string;
  price: number;
  quantity: number;
  variantId?: string;
  selection?: Record<string, string>;
}

export interface OfferConversionResult {
  /** Trigger the CTA behavior for the current conversionGoal. */
  execute: () => void;
  /** Which action is exposed by the CTA (informational). */
  goal: ConversionGoal;
  /** When true, the CTA should render a "Request price" dialog instead of firing directly. */
  requiresQuoteDialog: boolean;
  /** Toggle state for quote dialog. */
  quoteDialogOpen: boolean;
  setQuoteDialogOpen: (v: boolean) => void;
}

/**
 * Small action layer that maps a chosen conversionGoal into a real behavior
 * reusing existing infrastructure (cart, checkout, price-request dialog).
 */
export function useOfferConversion(args: UseOfferConversionArgs): OfferConversionResult {
  const { config, product, workspaceSlug, price, quantity, variantId, selection } = args;
  const navigate = useNavigate();
  const { addItem } = useStoreCart();
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false);

  const trackCta = useCallback(
    (extra: Record<string, unknown> = {}) => {
      trackEvent("smart_offer_cta_clicked", {
        workspaceSlug,
        productId: product?.id,
        preset: config.preset,
        conversionGoal: config.conversionGoal,
        variantId,
        quantity,
        value: price * quantity,
        currency: product?.currency,
        selection,
        ...extra,
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [workspaceSlug, product?.id, config.preset, config.conversionGoal, variantId, quantity, price],
  );

  const doAddToCart = useCallback(() => {
    if (!product) return;
    const primaryIndex = product.primary_image_index ?? 0;
    addItem(
      {
        productId: product.id,
        name: product.name,
        price,
        currency: product.currency,
        image: product.images?.[primaryIndex] || product.images?.[0],
        sku: product.sku || undefined,
      },
      quantity,
    );
    trackAddToCart({
      item_id: product.id,
      item_name: product.name,
      price,
      quantity,
      currency: product.currency,
      sku: product.sku || undefined,
      item_variant: variantId,
    });
  }, [addItem, price, product, quantity, variantId]);

  const execute = useCallback(() => {
    if (!product) return;

    const priceOnRequest = !!product.price_on_request;
    const outOfStock = product.stock_status === "out_of_stock";

    // Safety: prices on request never fire cart/checkout goals.
    if (priceOnRequest && (config.conversionGoal === "add_to_cart" || config.conversionGoal === "buy_now")) {
      setQuoteDialogOpen(true);
      trackCta({ redirected_to: "quote" });
      return;
    }

    switch (config.conversionGoal) {
      case "add_to_cart":
        if (outOfStock) return;
        doAddToCart();
        trackCta();
        break;
      case "buy_now":
        if (outOfStock) return;
        doAddToCart();
        trackCta();
        navigate(`/store/${workspaceSlug}/checkout`);
        break;
      case "request_quote":
      case "request_contact":
      case "book_assessment":
      case "book_demo":
        setQuoteDialogOpen(true);
        trackCta();
        break;
      case "enroll":
        // If product has a real price and stock, treat as cart+checkout;
        // otherwise fall back to contact/quote dialog.
        if (!priceOnRequest && !outOfStock && price > 0) {
          doAddToCart();
          trackCta();
          navigate(`/store/${workspaceSlug}/checkout`);
        } else {
          setQuoteDialogOpen(true);
          trackCta({ redirected_to: "contact" });
        }
        break;
    }
  }, [config.conversionGoal, doAddToCart, navigate, price, product, trackCta, workspaceSlug]);

  const requiresQuoteDialog = [
    "request_quote",
    "request_contact",
    "book_assessment",
    "book_demo",
  ].includes(config.conversionGoal) || !!product?.price_on_request;

  return {
    execute,
    goal: config.conversionGoal,
    requiresQuoteDialog,
    quoteDialogOpen,
    setQuoteDialogOpen,
  };
}
