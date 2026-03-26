

# Split CRMRoutes into modular sub-files

## What changes

The monolithic `CRMRoutes()` function in `App.tsx` (lines 153-318, ~165 lines, ~110 routes) will be split into 4 domain files under `src/routes/crm/`, each exporting a function that returns `<Route>` fragments. `App.tsx` will import and compose them.

## New files

### 1. `src/routes/crm/PublicSeoRoutes.tsx`
Routes for SEO content pages and legal pages (lines 162-185):
- `/keywords`, `/templates`, `/tools`, `/categories`, `/compare`, `/blog`, `/guides`, `/glossary`
- `/privacy`, `/terms`, `/gdpr`, `/cookies`
- Imports come from `@/modules/growth-seo`

### 2. `src/routes/crm/DashboardCoreRoutes.tsx`
Core dashboard, auth, settings, objects, system routes (lines 187-226):
- `/`, `/fastcrm`, `/login`, `/signup`, `/auth`, `/forgot-password`, `/onboarding`
- `/dashboard`, `/dashboard/command-center`, `/dashboard/intelligence`, `/dashboard/context-os`, `/dashboard/revenue`, `/dashboard/tasks`, `/dashboard/alerts`, `/dashboard/impact-map`
- `/dashboard/system/*`, `/dashboard/revenue-radar`, `/dashboard/kernel`
- `/objects/*`, `/settings/*`, `/platform/data`
- Lazy imports for all corresponding page components

### 3. `src/routes/crm/RevenueCommerceRoutes.tsx`
Marketplace, credit, strategy, misc dashboard tools (lines 269-288):
- `/dashboard/marketplace`, `/dashboard/admin/marketplace`
- `/dashboard/seo`, `/dashboard/instagram-looter`, `/dashboard/credit`
- `/dashboard/strategy`, `/dashboard/daily-brief`, `/dashboard/vision`
- `/dashboard/zapier`, `/dashboard/background-jobs`
- `/command-center`, `/command-center/:conversationId`
- `/dashboard/fastclub` redirects, `/mobile/*`

### 4. `src/routes/crm/VerticalOpsRoutes.tsx`
Public-facing pages, verticals, catch-all (lines 293-309):
- `/p/:workspaceSlug/:pageSlug`, `/product/:slug`, `/p/:slug`
- `/super-admin`, vertical landing pages (`/clinicas`, `/imobiliarias`, etc.)
- `/event-rsvp`, `/invite/:token`, `/vision/duo/accept/:token`
- `/:slug` catch-all, `*` not-found

## Changes to App.tsx

1. Remove all lazy `const` declarations that move into sub-modules (lines 60-134)
2. Remove the inline `CRMRoutes()` function (lines 153-318)
3. Add imports:
   ```ts
   import { PublicSeoRoutes } from "@/routes/crm/PublicSeoRoutes";
   import { DashboardCoreRoutes } from "@/routes/crm/DashboardCoreRoutes";
   import { RevenueCommerceRoutes } from "@/routes/crm/RevenueCommerceRoutes";
   import { VerticalOpsRoutes } from "@/routes/crm/VerticalOpsRoutes";
   ```
4. New `CRMRoutes()` function (~30 lines): just the provider wrapper + `<Routes>` composing all sub-modules:
   ```tsx
   function CRMRoutes() {
     return (
       <AuthProvider>
         <WorkspaceProvider>
           <ActivityProfileProvider>
             <WorkspaceInstanceProvider>
               <SubscriptionProvider>
                 <Suspense fallback={<PageLoader />}>
                   <Routes>
                     {PublicSeoRoutes()}
                     {DashboardCoreRoutes()}
                     {SalesCRMRoutes()}
                     {AIRoutes()}
                     <Route path="/dashboard/kpis" element={<ReportsKPIs />} />
                     {ReportsRoutes()}
                     {AccountBriefRoutes()}
                     {RevenueFlightControlRoutes()}
                     {PerformanceRoutes()}
                     {ProcurementRoutes()}
                     {SecurityRoutes()}
                     {StudentJourneyRoutes()}
                     {CheckoutAdminRoutes()}
                     {C2CDashboardRoutes()}
                     {StoreAdminRoutes()}
                     {B2BAdminRoutes()}
                     {RevenueCommerceRoutes()}
                     {VerticalOpsRoutes()}
                   </Routes>
                 </Suspense>
                 <GDPRBanner />
               </SubscriptionProvider>
             </WorkspaceInstanceProvider>
           </ActivityProfileProvider>
         </WorkspaceProvider>
       </AuthProvider>
     );
   }
   ```

## Result
- `App.tsx` drops from ~400 lines to ~150 lines
- Each sub-module is self-contained with its own lazy imports
- Zero URL changes — all routes remain identical
- Pattern matches existing route modules (functions returning `<>` fragments)

