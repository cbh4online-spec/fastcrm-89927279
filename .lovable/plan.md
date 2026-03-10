

# Plan: AI Assistant suggests Billing Type (Cobrança) and missing fields

## Problem
The AI Product Assistant already suggests category, price, description, and product type — but does NOT suggest the billing/charge type (Cobrança). The user wants the AI to also fill in this field and any other missing fields.

## Changes

### 1. Edge Function — `supabase/functions/ai-product-assistant/index.ts`
Update the "suggest" mode prompt (lines 154-179) to:
- Add `billingType` to the requested JSON output with valid values matching the system's billing type codes (e.g., `one_time`, `recurring`, `hourly`, `per_session`, etc.)
- Fetch available billing types from DB or accept them as input parameter
- Include the field in the response JSON schema

### 2. Frontend Hook — `src/hooks/useProductAIAssistant.ts`
- Add `billingType` to the `ProductSuggestion` interface

### 3. AI Assistant Component — `src/components/products/AIProductAssistant.tsx`
- Add `onApplyBillingType` callback prop
- Display suggested billing type with "Usar" button (same pattern as productType)
- Add billing type labels map

### 4. Create Product Dialog — `src/components/products/CreateProductDialog.tsx`
- Pass `onApplyBillingType` to `AIProductAssistant`, setting `setBillingType`
- Pass available billing type codes to the AI assistant for validation

### Flow
```text
User types product name
  → AI edge function returns { ..., billingType: "one_time" }
  → AIProductAssistant shows "Cobrança sugerida: Única → Usar"
  → User clicks → setBillingType("one_time")
```

