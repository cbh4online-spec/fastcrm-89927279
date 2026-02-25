

# Frontend Status: Almost Complete — One Gap to Fix

All frontend components for Ask FastCRM (dialog, inline, TopBar button, automation preview, proactive nudge) were already built in previous iterations. They compile and integrate correctly.

## What Already Works

| Component | Status |
|---|---|
| `AskFastCRMDialog` (⌘K shortcut) | Done — opens from TopBar, has autocomplete, automation preview, quota indicator |
| `AskFastCRMInline` (Intelligence → Assist tab) | Done — full inline experience with automation confirm/cancel |
| TopBar Ask button (`<Sparkles>` + ⌘K badge) | Done — triggers dialog |
| `AskAutomationPreview` (When/If/Then) | Done — edit mode, object badges, quota indicator |
| `AskFastCRMResultPanel` | Done — renders automation preview when intent detected |
| `AskProactiveNudge` (Dashboard) | Done — shows stale deals, closing-this-week nudges |
| Quota enforcement in `confirmAutomation` | Done — checks `max_automations`, `multi_conditions`, `multi_actions` |

## One Gap Found

**Prefilled query from proactive nudge is not passed to the dialog.**

In `Dashboard.tsx`, `askPrefilledQuery` is set when a nudge is clicked, but the `AskFastCRMDialog` component does not accept or use an `initialQuery` prop. The dialog always opens empty.

### Fix

1. **`AskFastCRMDialog`**: Add optional `initialQuery?: string` prop. When provided and dialog opens, set it as input and auto-submit via `ask()`.

2. **`Dashboard.tsx`**: Pass `askPrefilledQuery` to `<AskFastCRMDialog initialQuery={askPrefilledQuery} />` and clear it after dialog closes.

## Files to Edit

| File | Change |
|---|---|
| `src/components/ask-fastcrm/AskFastCRMDialog.tsx` | Add `initialQuery` prop, auto-submit on open when provided |
| `src/pages/Dashboard.tsx` | Pass `askPrefilledQuery` to dialog, clear on close |

This is a small fix — everything else is already built and integrated.

