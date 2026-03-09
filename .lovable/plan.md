

# Implementar Emitters em Falta na Event Decision Matrix

## Audit: Estado Atual dos 21 Eventos

```text
EVENT NAME                              | EMITTER EXISTS? | LOCATION
----------------------------------------|-----------------|----------------------------------
crm.lead.created                        | YES             | useLeads.ts
crm.lead.scored                         | YES             | useLeadScores.ts, useSmartLeads.ts
crm.company.enriched                    | NO              | useCompanyEnrichment.ts (missing)
crm.company.icp_scored                  | NO              | useCompanyScores.ts (missing)
crm.opportunity.created                 | YES             | useOpportunitiesEnhanced.ts
crm.opportunity.stage_changed           | YES             | useOpportunitiesEnhanced.ts
crm.opportunity.deal_score_computed     | YES             | compute-deal-score EF
crm.opportunity.stalled_detected        | YES             | compute-deal-score EF
crm.opportunity.closed_won              | PARTIAL         | useCloseOpportunity (emits CLOSED)
sales.proposal.sent                     | YES             | useProposals.ts (PROPOSAL.SENT)
sales.proposal.viewed                   | NO              | No emitter exists
sales.proposal.accepted                 | YES             | useProposals.ts (PROPOSAL.SIGNED)
sales.invoice.paid                      | NO              | useInvoices.ts (missing)
calendar.meeting.completed              | YES             | useMeetings.ts
calendar.meeting.action_items_extracted | NO              | useMeetingTranscript.ts (missing)
comm.message.received                   | YES             | ConversationList.tsx
comm.email.received                     | NO              | No emitter exists
strategy.goal.updated                   | NO              | useSalesGoals.ts (missing)
strategy.forecast.computed              | NO              | useRevenueForecast.ts (missing)
strategy.kernel.signal_created          | NO              | Edge function (missing)
strategy.kernel.decision_created        | NO              | Edge function (missing)
```

## 11 Emitters em Falta a Implementar

### Grupo 1 — Hooks Frontend (7 ficheiros)

1. **`src/hooks/useCompanyEnrichment.ts`** — Adicionar `emitKernelEvent` no `onSuccess` de `useCompanyEnrichment()` com tipo `COMPANY.ENRICHED`

2. **`src/hooks/useCompanyScores.ts`** — Adicionar `emitKernelEvent` no `onSuccess` de `useUpdateCompanyScores()` com tipo `COMPANY.ICP_SCORED`

3. **`src/hooks/useOpportunitiesEnhanced.ts`** — No `useCloseOpportunity`, emitir `OPPORTUNITY.CLOSED_WON` quando `status === 'won'` (atualmente emite genérico `OPPORTUNITY.CLOSED`)

4. **`src/hooks/useInvoices.ts`** — Adicionar `emitKernelEvent` no `onSuccess` de `useMarkInvoicePaid()` com tipo `INVOICE.PAID`

5. **`src/hooks/useMeetingTranscript.ts`** — Adicionar `emitKernelEvent` após `analyzeTranscript` completar, com tipo `MEETING.ACTION_ITEMS_EXTRACTED`

6. **`src/hooks/useSalesGoals.ts`** — Adicionar `emitKernelEvent` no `onSuccess` de `useUpdateSalesGoal()` e `useUpsertSalesGoal()` com tipo `GOAL.UPDATED`

7. **`src/hooks/useRevenueForecast.ts`** — Adicionar `emitKernelEvent` no `onSuccess` da mutation de forecast com tipo `FORECAST.COMPUTED`

### Grupo 2 — Edge Functions (2 funções)

8. **`supabase/functions/kernel-ingest-event/index.ts`** — Após gerar sinal com sucesso, inserir evento `SIGNAL.CREATED` na tabela `kernel_events` (self-referencing, sem recursão pois não passa pela matrix)

9. **`supabase/functions/kernel-ingest-event/index.ts`** — Após criar decisão, inserir evento `DECISION.CREATED` na tabela `kernel_events`

### Grupo 3 — Emitters Não-Triviais (2 casos)

10. **`sales.proposal.viewed`** — Requer emissão na página pública de proposta quando o cliente visualiza. Procurar o componente de visualização pública e adicionar `emitKernelEvent` ou chamada à edge function.

11. **`comm.email.received`** — Depende de webhook externo (email provider). Adicionar emissão no handler de recepção de emails se existir, ou documentar como pendente de integração.

### Padrão de Implementação

Cada emitter segue o mesmo padrão:
```typescript
emitKernelEvent({
  workspace_id: currentWorkspace.id,
  type: 'ENTITY.ACTION',        // ex: COMPANY.ENRICHED
  entity_kind: 'entity_type',   // ex: company
  entity_id: data.id,
  actor_type: 'user',           // ou 'system' para EFs
  actor_id: user?.id,
  source_module: 'module-name',
  payload: { /* dados relevantes */ },
});
```

### Imports necessários em cada ficheiro
- `import { emitKernelEvent } from "@/lib/kernelEmitter";`
- Contextos: `useWorkspace`, `useAuth` (onde ainda não existam)

### Estimativa
- 7 hooks frontend: alterações pequenas (~10-20 linhas cada)
- 2 inserções na edge function: ~15 linhas cada
- 1 página pública de proposta: ~10 linhas
- 1 email webhook: documentar como pendente

