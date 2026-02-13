

## Analytics Privacy-First: Implementacao Completa

### Estado: ✅ CONCLUÍDO

Todos os 16 eventos de tracking do `useCRMAnalytics` estão agora integrados.

---

### Eventos Integrados

| # | Evento | Ficheiro | Estado |
|---|--------|----------|--------|
| 1 | `crm.session_start` | `useCRMAnalytics` (useEffect) | ✅ |
| 2 | `inbox.opened` | `InboxView.tsx` | ✅ |
| 3 | `conversation.opened` | `ConversationDetail.tsx` | ✅ |
| 4 | `conversation.replied` | `AIMessageComposer.tsx` | ✅ |
| 5 | `conversation.converted` | `OpportunityTriggerBanner.tsx` | ✅ |
| 6 | `template.used` | `InboxTemplatePanel.tsx` | ✅ |
| 7 | `template.conversion` | Backend — `template-log-event` edge function (DB-side tracking) | ✅ DB |
| 8 | `lead.created` | `CreateLeadDialog.tsx` | ✅ |
| 9 | `lead.moved_pipeline` | `OpportunitiesModule.tsx`, `CrmBoardView.tsx` | ✅ |
| 10 | `opportunity.created` | `CreateOpportunityEnhancedDialog.tsx`, `OpportunityTriggerBanner.tsx` | ✅ |
| 11 | `ai.suggestion.generated` | `AIMessageComposer.tsx` | ✅ |
| 12 | `ai.suggestion.accepted` | `AIMessageComposer.tsx` | ✅ |
| 13 | `ai.suggestion.rejected` | `AIMessageComposer.tsx` (fechar painel sem usar) | ✅ |
| 14 | `automation.created` | `VisualAutomationBuilder.tsx` | ✅ |
| 15 | `automation.triggered` | `useInboxActions.ts` | ✅ |
| 16 | `checkout.started` | `PricingCards.tsx` | ✅ |
| 17 | `checkout.completed` | `StoreSuccessPage.tsx` | ✅ |

### Notas

- `template.conversion` é tracking DB-side na edge function `template-log-event` (eventos `replied`, `opportunity_created`, `deal_won`)
- Todos os eventos frontend passam pela camada de sanitização PII e bucketização
- Eventos só disparam com `consent.analytics === true` e em ambiente `prod`
