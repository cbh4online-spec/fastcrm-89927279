

# Fix: Show AI suggestions for Tipo and Cobrança fields

## Problem
In `AIProductAssistant.tsx`, the product type and billing type suggestions are hidden when the AI-suggested value matches the current value:
```tsx
// Line 285 — hides when suggested === current
{suggestFromName.data.productType && suggestFromName.data.productType !== currentProductType && (
// Line 307 — same pattern
{suggestFromName.data.billingType && suggestFromName.data.billingType !== currentBillingType && onApplyBillingType && (
```

Since the form defaults to `"simple"` and `"one-off"`, and the AI often suggests those same values, the suggestions never appear — even though the user hasn't consciously selected anything.

## Solution
Always show the Type and Billing suggestions when the AI returns them, regardless of whether they match the current value. Change the style to show "Aplicado" or a confirmation when they already match, so the user sees the AI validated their current selection.

### Changes to `src/components/products/AIProductAssistant.tsx`

1. **Remove the `!== currentProductType` condition** on line 285 — always show product type suggestion
2. **Remove the `!== currentBillingType` condition** on line 307 — always show billing type suggestion
3. **When the suggested value matches current**, show it as already confirmed (e.g., "✓ simple" with a muted style) instead of hiding it entirely

This way users always see what the AI recommends for Type and Billing, even if it confirms the default.

