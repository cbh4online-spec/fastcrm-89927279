import { lazy } from "react";
import { Route, Routes } from "react-router-dom";
import { StoreCartProvider } from "@/contexts/StoreCartContext";
import { StoreErrorBoundary } from "@/components/store/StoreErrorBoundary";

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
const StoreOrderTrackingPage = lazy(() => import("@/pages/store/StoreOrderTrackingPage"));
const StoreCatalogViewPage = lazy(() => import("@/pages/store/StoreCatalogViewPage"));

export function StoreRoutes() {
  return (
    <StoreCartProvider>
      <Routes>
        <Route path=":workspaceSlug" element={<StorePage />} />
        <Route
          path=":workspaceSlug/product/:productId"
          element={<StoreErrorBoundary><StoreProductPage /></StoreErrorBoundary>}
        />
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
        <Route path=":workspaceSlug/seller/:sellerSlug" element={<StoreSellerPage />} />
        <Route path=":workspaceSlug/order/:orderId" element={<StoreOrderTrackingPage />} />
        <Route path=":workspaceSlug/catalog/:catalogSlug" element={<StoreCatalogViewPage />} />
      </Routes>
    </StoreCartProvider>
  );
}
