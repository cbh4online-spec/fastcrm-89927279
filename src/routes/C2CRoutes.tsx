import { lazy } from "react";
import { Route } from "react-router-dom";

const C2CMarketplace = lazy(() => import("@/pages/c2c/C2CMarketplace"));
const C2CListingDetail = lazy(() => import("@/pages/c2c/C2CListingDetail"));
const C2CCreateListing = lazy(() => import("@/pages/c2c/C2CCreateListing"));
const C2CMyListings = lazy(() => import("@/pages/c2c/C2CMyListings"));
const C2CMessages = lazy(() => import("@/pages/c2c/C2CMessages"));
const C2CFavorites = lazy(() => import("@/pages/c2c/C2CFavorites"));
const C2CSellerBoost = lazy(() => import("@/pages/c2c/C2CSellerBoost"));
const C2CSponsorAdmin = lazy(() => import("@/pages/c2c/C2CSponsorAdmin"));
const C2CSellerDashboard = lazy(() => import("@/pages/c2c/C2CSellerDashboard"));
const C2CSellerArea = lazy(() => import("@/pages/c2c/C2CSellerArea"));
const C2CMarketplaceAnalytics = lazy(() => import("@/pages/c2c/C2CMarketplaceAnalytics"));
const C2CAffiliateCenter = lazy(() => import("@/pages/c2c/C2CAffiliateCenter"));
const C2CReferralCenter = lazy(() => import("@/pages/c2c/C2CReferralCenter"));
const C2CAffiliateAdmin = lazy(() => import("@/pages/c2c/C2CAffiliateAdmin"));
const C2CSellerProfile = lazy(() => import("@/pages/c2c/C2CSellerProfile"));
const C2CEditListing = lazy(() => import("@/pages/c2c/C2CEditListing"));
const C2CClientsManagement = lazy(() => import("@/pages/c2c/C2CClientsManagement"));
const C2CPublicLinksManager = lazy(() => import("@/pages/c2c/C2CPublicLinksManager"));
const C2CNotifications = lazy(() => import("@/pages/c2c/C2CNotifications"));
const C2COrders = lazy(() => import("@/pages/c2c/C2COrders"));
const C2CContentModeration = lazy(() => import("@/pages/c2c/C2CContentModeration"));
const C2CLoyaltyProgram = lazy(() => import("@/pages/c2c/C2CLoyaltyProgram"));
const C2CVerificationPage = lazy(() => import("@/pages/c2c/C2CVerificationPage"));
const C2CDisputesPage = lazy(() => import("@/pages/c2c/C2CDisputesPage"));
const C2CSellerTiersPage = lazy(() => import("@/pages/c2c/C2CSellerTiersPage"));
const C2CSellersAdmin = lazy(() => import("@/pages/c2c/C2CSellersAdmin"));
const C2CModerationPage = lazy(() => import("@/pages/c2c/C2CModerationPage"));
const MarketplaceConfigPage = lazy(() => import("@/pages/dashboard/marketplace/MarketplaceConfigPage"));

export function C2CDashboardRoutes() {
  return (
    <>
      <Route path="/dashboard/c2c" element={<C2CMarketplace />} />
      <Route path="/dashboard/c2c/create" element={<C2CCreateListing />} />
      <Route path="/dashboard/c2c/my-listings" element={<C2CMyListings />} />
      <Route path="/dashboard/c2c/messages" element={<C2CMessages />} />
      <Route path="/dashboard/c2c/favorites" element={<C2CFavorites />} />
      <Route path="/dashboard/c2c/boost" element={<C2CSellerBoost />} />
      <Route path="/dashboard/c2c/sellers" element={<C2CSellersAdmin />} />
      <Route path="/dashboard/c2c/sponsors" element={<C2CSponsorAdmin />} />
      <Route path="/dashboard/c2c/analytics" element={<C2CSellerDashboard />} />
      <Route path="/dashboard/c2c/seller-area" element={<C2CSellerArea />} />
      <Route path="/dashboard/c2c/marketplace-analytics" element={<C2CMarketplaceAnalytics />} />
      <Route path="/dashboard/c2c/affiliates" element={<C2CAffiliateCenter />} />
      <Route path="/dashboard/c2c/referrals" element={<C2CReferralCenter />} />
      <Route path="/dashboard/c2c/affiliate-admin" element={<C2CAffiliateAdmin />} />
      <Route path="/dashboard/c2c/notifications" element={<C2CNotifications />} />
      <Route path="/dashboard/c2c/orders" element={<C2COrders />} />
      <Route path="/dashboard/c2c/moderation" element={<C2CContentModeration />} />
      <Route path="/dashboard/c2c/loyalty" element={<C2CLoyaltyProgram />} />
      <Route path="/dashboard/c2c/verification" element={<C2CVerificationPage />} />
      <Route path="/dashboard/c2c/disputes" element={<C2CDisputesPage />} />
      <Route path="/dashboard/c2c/tiers" element={<C2CSellerTiersPage />} />
      <Route path="/dashboard/c2c/config" element={<MarketplaceConfigPage />} />
      <Route path="/dashboard/c2c/seller/:sellerId" element={<C2CSellerProfile />} />
      <Route path="/dashboard/c2c/edit/:id" element={<C2CEditListing />} />
      <Route path="/dashboard/c2c/clients" element={<C2CClientsManagement />} />
      <Route path="/dashboard/c2c/public-links" element={<C2CPublicLinksManager />} />
      <Route path="/dashboard/c2c/:id" element={<C2CListingDetail />} />
    </>
  );
}
