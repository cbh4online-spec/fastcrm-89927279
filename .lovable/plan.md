

# Replicar Menus Consolidados para Empresas + Melhorias Leads

## Análise Comparativa

| Secção | Leads ✓ | Contactos ✓ | Empresas ✗ |
|--------|---------|-------------|------------|
| communication (SubTabs) | messages, scheduling | emails, messages, scheduling | cases separados (messages, scheduling) |
| activity (SubTabs) | tasks, automations | tasks, automations | cases separados (tasks, automations) |
| business (SubTabs) | opportunities, proposals, credit | opportunities, proposals, credit | cases separados (opportunities, proposals) — sem credit |
| data (SubTabs) | details, fields, audit | details, fields, audit | cases separados (details, audit) — sem fields |
| insights | AgentQueue, AI, Memory | AgentQueue, AI, Memory | Sem AgentQueue nem Memory |
| emails em communication | ✗ Falta | ✓ | ✗ Falta |

## Alterações

### 1. `src/components/companies/CompanyDetailWithSidebar.tsx` — Consolidar switch cases

**Imports a adicionar:**
- `EmailHistorySection` de `@/components/email`
- `EntityCreditProposalsSection` de `@/modules/credit-intermediation`
- `AgentQueueStatus` de `@/components/ai-agents/AgentQueueStatus`
- `EntityMemoryPanel` de `@/components/ai-agents/EntityMemoryPanel`
- `CustomFieldsSection` (company variant) — verificar se existe `CompanyCustomFieldsSection`

**Cases a consolidar:**
- Remover cases individuais: `messages`, `tasks`, `automations`, `opportunities`, `proposals`, `scheduling`, `audit`, `details`, `relationships`
- `case 'communication'` → EntitySubTabs com emails, messages, scheduling
- `case 'activity'` → EntitySubTabs com tasks, automations
- `case 'business'` → EntitySubTabs com opportunities, proposals, credit
- `case 'data'` → EntitySubTabs com details, fields, relationships, audit

**Enriquecer insights:**
- Adicionar `AgentQueueStatus` e `EntityMemoryPanel` ao `case 'insights'`

### 2. `src/components/crm/LeadDetailWithSidebar.tsx` — Adicionar emails à comunicação

- Importar `EmailHistorySection` de `@/components/email`
- No `case 'communication'`, adicionar sub-tab `emails` (como nos contactos)

### 3. `src/hooks/useWorkspaceLayoutConfig.ts` — Garantir defaults corretos

- Verificar que `notes` está nos DEFAULT_SECTIONS para os 3 tipos (pode faltar após a última alteração)

| Ficheiro | Acção |
|----------|-------|
| `CompanyDetailWithSidebar.tsx` | Consolidar ~10 cases em 4 agrupados + enriquecer insights |
| `LeadDetailWithSidebar.tsx` | Adicionar emails sub-tab à comunicação |
| `useWorkspaceLayoutConfig.ts` | Adicionar `notes` aos DEFAULT_SECTIONS |

