

# Plan: AI Assistant for Product Settings Configuration

## Problem
The product settings page (Tipos de Produto, Cobrança, Categorias, Condições Pagamento, etc.) requires manual entry. The user wants AI to suggest common configuration entries automatically.

## Solution
Add an "AI Suggest" button to the `ProductSettingsTabContent` header that calls a new mode in the `ai-product-assistant` edge function. The AI analyzes the workspace context (industry, existing products) and suggests missing configuration entries for the active tab.

## Changes

### 1. Edge Function — `ai-product-assistant/index.ts`
Add a new mode `"suggest-settings"` that:
- Receives the `settingsType` (types, billing, categories, payment-conditions, payment-methods, consumption, delivery, frequencies)
- Receives existing entries for that tab
- Returns an array of suggested new entries with all required fields (code, label, description, icon, color, etc.)
- Uses Lovable AI (Gemini Flash) to generate contextual suggestions

### 2. New Component — `src/components/products/settings/AISettingsSuggestions.tsx`
- A panel/dialog that shows AI-suggested entries for the current settings tab
- Each suggestion has a "Adicionar" button to create it via the existing hooks
- Shows loading state, error handling
- Appears when user clicks "Sugerir com IA" button

### 3. Update `ProductSettingsTabContent.tsx`
- Add a "Sugerir com IA" (Sparkles icon) button next to the header
- Pass the active tab and existing data to the AI suggestions component
- Wire up the create mutations from each settings hook

### 4. Update `useProductAIAssistant.ts`
- Add a new `suggestSettings` mutation that calls mode `"suggest-settings"`

## Flow
```text
User clicks "Sugerir com IA" on Settings page
  → Edge function receives settingsType + existing entries
  → AI returns suggested entries (e.g., 3-5 new types/billing/etc.)
  → Dialog shows suggestions with "Adicionar" buttons
  → User clicks → entry is created via existing hook
```

## Scope per tab
- **Tipos de Produto**: suggest codes like `consultoria`, `licenciamento`, `suporte`, etc.
- **Cobrança**: suggest `one-off`, `monthly`, `yearly`, etc. with is_recurring + frequency
- **Categorias**: suggest industry-relevant categories
- **Condições Pagamento**: suggest `net-30`, `net-60`, `pronto-pagamento`, etc. with days
- **Métodos Pagamento**: suggest `transferencia`, `cartao`, `mbway`, etc.
- **Modelos Consumo**: suggest `por-hora`, `por-utilizador`, `ilimitado`, etc.
- **Modos Entrega**: suggest `online`, `presencial`, `hibrido`, etc.
- **Frequências**: suggest `semanal`, `mensal`, `trimestral`, etc. with interval_days

