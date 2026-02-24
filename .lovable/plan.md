

# Sub-Phase D: Conversational Onboarding + Monetization

## What Exists

- **Onboarding**: Multi-step form flow (business type → activity profile → success definition → process → channels → AI generation → preview → apply). Works but is form-based, not conversational.
- **Subscription**: `SubscriptionContext` with 4 plans (free/basic/pro/agency), Stripe checkout via `create-checkout` edge function, `check-subscription` for validation.
- **Extension Registry**: `extensionRegistry.ts` maps module slugs to object tabs, intelligence capabilities, automation templates.

## Changes

### 1. Conversational Onboarding Redesign

Replace the current step-by-step form with a chat-style conversational interface. The AI asks questions one at a time in a chat bubble format, the user responds via quick-reply buttons or text input.

**New questions added** (per spec):
- Revenue model (subscription, one-time, project-based, mixed)
- Team size (solo, 2-5, 6-20, 20+)
- Sales cycle complexity (simple/medium/complex)

**Flow:**
1. Welcome message (chat bubble) → Ask workspace name (text input)
2. Business type → Quick-reply cards
3. Revenue model → Quick-reply buttons
4. Team size → Quick-reply buttons
5. Sales cycle complexity → Quick-reply buttons
6. AI generates config (typing indicator animation)
7. Summary card with what was created
8. Suggest relevant extensions from marketplace

**After AI config applies:**
- Create Objects (pipeline, fields)
- Create recommended automations
- Configure initial dashboard
- Suggest extensions based on business type (e.g., education → Student Journey pack)

### 2. Extension Packs for Monetization

Define extension packs in the extension registry that bundle related modules:

| Pack | Modules | Plan Required |
|---|---|---|
| B2B Revenue Pack | proposals, invoices, b2b-portal | basic+ |
| Finance Pack | invoices, credit-intermediation | basic+ |
| Proposals Pack | proposals | basic+ |
| Education Pack | student-journey | pro+ |
| Commerce Pack | online-store, c2c-marketplace | pro+ |
| Advanced Intelligence | lead-enricher, prospecting-pro, seo-growth | pro+ |

### 3. Onboarding Extension Suggestions

After onboarding completes, show a "Recommended Extensions" step based on business type mapping:
- education → Education Pack
- retail/ecommerce → Commerce Pack
- b2b/services → B2B Revenue Pack
- marketing → Advanced Intelligence Pack

### 4. Plan Gating on Extensions

Update the marketplace to show plan requirements on each extension pack. Free users see all packs but get an upgrade prompt when trying to install paid ones.

## Files

### Create

| File | Description |
|---|---|
| `src/components/onboarding/ConversationalOnboarding.tsx` | Chat-style onboarding UI with message bubbles, quick replies, typing indicators |
| `src/components/onboarding/ChatMessage.tsx` | Individual chat message bubble component |
| `src/components/onboarding/QuickReplies.tsx` | Quick-reply button grid for conversational choices |
| `src/components/onboarding/ExtensionSuggestions.tsx` | Post-onboarding extension pack recommendations |
| `src/config/extensionPacks.ts` | Extension pack definitions with plan gating |

### Edit

| File | Change |
|---|---|
| `src/pages/Onboarding.tsx` | Replace `IntelligentOnboarding` with `ConversationalOnboarding` |
| `src/hooks/useIntelligentOnboarding.ts` | Add revenue model, team size, sales complexity fields; update AI prompt to include new data |
| `supabase/functions/ai-onboarding-setup/index.ts` | Accept new fields (revenue model, team size, complexity); include in AI prompt; add extension suggestions to response |
| `src/components/onboarding/steps/ApplyingStep.tsx` | Add step for suggesting extensions after config is applied |

### Technical Details

- Chat messages stored in local state array `{role: 'assistant' | 'user', content: string, type: 'text' | 'quick-reply' | 'card'}`
- Each AI question renders with a typing delay (300-800ms) for natural feel
- Quick replies render as pill buttons below the latest assistant message
- After user selects, the choice appears as a user bubble and next question auto-triggers
- The AI generation step shows a "thinking" animation in chat
- Final summary renders as a rich card in the chat

