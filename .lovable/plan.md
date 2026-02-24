

# Marketplace Page: Extension Packs Section

## What Exists

- **Marketplace page** (`src/pages/Marketplace.tsx`): Shows individual modules with search, category filter, and install/uninstall. Has "Descobrir" and "Instalados" tabs.
- **Extension Packs** (`src/config/extensionPacks.ts`): 6 packs defined with `requiredPlan` gating and `canInstallPack()` helper.
- **BundleCard** (`src/components/marketplace/BundleCard.tsx`): Exists but designed for `MarketplaceBundle` type (different from `ExtensionPack`).
- **Subscription** (`SubscriptionContext`): Provides `plan`, `createCheckout()`, plan info with pricing.
- **useWorkspaceModules**: `installModule(slug)` to install individual modules.

## Changes

### 1. New Component: `ExtensionPackCard.tsx`

Card component for displaying an `ExtensionPack` with:
- Pack icon, name, description, color accent
- List of included module slugs
- Required plan badge (e.g., "Basic+" or "Pro+")
- **If user's plan allows**: "Instalar Pack" button that installs all modules in the pack
- **If plan is insufficient**: Upgrade prompt with plan name/price and "Fazer Upgrade" CTA
- **If all modules already installed**: "Instalado" disabled state

### 2. Edit: `src/pages/Marketplace.tsx`

Add a third tab "Packs" (between "Descobrir" and "Instalados") that renders all 6 extension packs in a grid using `ExtensionPackCard`. Each card uses `canInstallPack()` for gating and `installModule()` for bulk install.

### Files

| File | Action |
|---|---|
| `src/components/marketplace/ExtensionPackCard.tsx` | Create — card with plan gating, install, upgrade prompt |
| `src/pages/Marketplace.tsx` | Edit — add "Packs" tab rendering the 6 extension packs |

### Technical Details

- `ExtensionPackCard` imports `EXTENSION_PACKS`, `canInstallPack` from `extensionPacks.ts`
- Uses `useSubscription()` for `plan` and `createCheckout()`
- Uses `useWorkspaceModules()` for `installModule()` and `isModuleInstalled()`
- Bulk install loops through `pack.modules` calling `installModule(slug)` for each
- Plan tier badges: free → show all locked, basic → unlock basic packs, pro → unlock all
- Upgrade prompt uses amber/orange gradient style consistent with existing `FeatureLockedState`

