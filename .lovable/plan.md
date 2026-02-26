

# Auditoria de Menus: Ficha do Contacto

## Diagnóstico

A ficha do contacto tem actualmente **19 tabs** (8 visíveis + 11 em overflow "+7 mais"). Isto cria:
- **Sobrecarga cognitiva** — o utilizador não sabe onde encontrar o que precisa
- **Tabs redundantes** — "Notas" e "Timeline" sobrepõem-se; "Informações" e "Campos" são ambos dados do perfil
- **Overflow esconde funcionalidade importante** — Pagamentos, Encomendas e Histórico ficam escondidos
- **Tabs condicionais misturados** — Student Journey e Crédito aparecem mesmo quando irrelevantes

## Proposta de Consolidação: 19 → 8 tabs

```text
ANTES (19 tabs)                    DEPOIS (8 tabs)
─────────────────                  ────────────────
Visão Geral                   →   Visão Geral (igual)
Insights IA                   →   Insights IA (igual)
Timeline + Notas              →   Timeline (notas integradas como eventos)
Mensagens + Agendamentos      →   Comunicação (emails, msgs, agendamentos)
Tarefas + Automações          →   Atividade (tarefas e automações)
Oportunidades + Propostas     →   Negócios (opps, propostas, crédito)
  + Crédito
Pagamentos + Encomendas       →   Financeiro (pagamentos, encomendas,
  + Histórico                       histórico comercial)
Informações + Campos          →   Dados (info, campos, relações,
  + Relações + Auditoria             auditoria em accordion)
Student Journey               →   (condicional, só se módulo activo — fica no 9º)
```

Resultado: **8 tabs sempre visíveis**, sem overflow. Student Journey aparece como 9º apenas quando o módulo está activo.

## Alterações Técnicas

### 1. `src/types/entity.ts`
- Adicionar novos `MenuSection` values: `'communication'`, `'activity'`, `'business'`, `'financial'`, `'data'`
- Remover os antigos que ficam agrupados

### 2. `src/components/entity/EntityHorizontalTabs.tsx`
- Reduzir `ALL_TABS` de 19 para 8-9 entries
- Remover lógica de overflow (já não será necessária com 8 tabs)
- Manter dropdown apenas para Student Journey condicional

### 3. `src/components/contacts/eni/ENIContactDetailWithSidebar.tsx`
- Consolidar cases no `renderSectionContent()`:
  - `case 'communication'`: renderiza `EmailHistorySection` + `ContactMessagesSection` + `EntitySchedulingSection` em tabs internas ou accordion
  - `case 'activity'`: renderiza `EntityTasksSection` + `EntityAutomationSection`
  - `case 'business'`: renderiza `EntityOpportunitiesSection` + `EntityProposalsSection` + `EntityCreditProposalsSection`
  - `case 'financial'`: renderiza `CommercialHistorySection` + `AcquiredProductsSection` + `InvoiceHistorySection` + `ContactOrderNotesSection`
  - `case 'data'`: renderiza `IdentificationSection` + `ProfessionalProfileSection` + `DocumentsSection` + `ContactAuditSection` em collapsibles
  - `case 'timeline'`: adiciona `NotesSection` integrado na timeline
- Remover cases antigos que foram agrupados

### 4. Componente auxiliar: `src/components/entity/EntitySubTabs.tsx`
- Criar um sub-tab component leve (pills/segmented control) para alternar dentro das secções consolidadas
- Ex: dentro de "Financeiro" → pills: Pagamentos | Encomendas | Histórico

### 5. Aplicar mesma lógica a Lead e Company
- `EntityHorizontalTabs` já serve as 3 entidades — a consolidação aplica-se automaticamente
- Verificar `renderSectionContent` nos detalhe de leads e companies

## Ficheiros

| Ficheiro | Acção |
|----------|-------|
| `src/types/entity.ts` | Novos MenuSection consolidados |
| `src/components/entity/EntityHorizontalTabs.tsx` | Reduzir tabs de 19 para 8 |
| `src/components/entity/EntitySubTabs.tsx` | Novo — sub-tabs dentro de secções |
| `src/components/contacts/eni/ENIContactDetailWithSidebar.tsx` | Agrupar renders por nova estrutura |

