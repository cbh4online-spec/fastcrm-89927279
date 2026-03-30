import { lazy } from "react";
import { Route, Routes } from "react-router-dom";
import { StoreCartProvider } from "@/contexts/StoreCartContext";

const StorePage = lazy(() => import("@/pages/store/StorePage"));
const StoreProductPage = lazy(() => import("@/pages/store/StoreProductPage"));
const StoreCheckoutPage = lazy(() => import("@/pages/store/StoreCheckoutPage"));
const StoreSuccessPage = lazy(() => import("@/pages/store/StoreSuccessPage"));
const StoreCancelPage = lazy(() => import("@/pages/store/StoreCancelPage"));
const StoreWishlistPage = lazy(() => import("@/pages/store/StoreWishlistPage"));
const StoreOrderHistoryPage = lazy(() => import("@/pages/store/StoreOrderHistoryPage"));
const StoreDigitalAssetsPage = lazy(() => import("@/pages/store/StoreDigitalAssetsPage"));
const StoreLoyaltyPage = lazy(() => import("@/pages/store/StoreLoyaltyPage"));
const StoreReferralPage = lazy(() => import("@/pages/store/StoreReferralPage"));
const StoreGiftCardsPage = lazy(() => import("@/pages/store/StoreGiftCardsPage"));
const StoreRecoverCartPage = lazy(() => import("@/pages/store/StoreRecoverCartPage"));
const StoreSellerPage = lazy(() => import("@/pages/store/StoreSellerPage"));

export function StoreRoutes() {
  return (
    <StoreCartProvider>
      <Routes>
        <Route path=":workspaceSlug" element={<StorePage />} />
        <Route path=":workspaceSlug/product/:productId" element={<StoreProductPage />} />
        <Route path=":workspaceSlug/checkout" element={<StoreCheckoutPage />} />
        <Route path=":workspaceSlug/success" element={<StoreSuccessPage />} />
        <Route path=":workspaceSlug/cancel" element={<StoreCancelPage />} />
        <Route path=":workspaceSlug/wishlist" element={<StoreWishlistPage />} />
        <Route path=":workspaceSlug/orders" element={<StoreOrderHistoryPage />} />
        <Route path=":workspaceSlug/downloads" element={<StoreDigitalAssetsPage />} />
        <Route path=":workspaceSlug/loyalty" element={<StoreLoyaltyPage />} />
        <Route path=":workspaceSlug/referrals" element={<StoreReferralPage />} />
        <Route path=":workspaceSlug/gift-cards" element={<StoreGiftCardsPage />} />
        <Route path=":workspaceSlug/recover/:token" element={<StoreRecoverCartPage />} />
      </Routes>
    </StoreCartProvider>
  );
}
