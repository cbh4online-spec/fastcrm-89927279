

# Plan: Add Advanced Sales Framework Templates

## What's Changing

Adding 6 new pre-built templates to the `vendas` category covering advanced sales methodologies: SPIN Selling, MEDDIC, Challenger Sale, ChAMP, GPCTBA/C&I, and Sandler Pain Funnel.

## Current State

- 18 templates exist across 6 categories
- The `vendas` category has 4 templates (BANT, Cold Outreach, Follow-Up, Proposta)
- All templates follow the same `LibraryTemplate` interface with fields including `description`
- Available structure types: `AIDA | PAS | BAB | FourP | AIDA_SHORT | REENGAGE | FollowUp | ColdOutreach | custom`

## New Templates

### 1. SPIN Selling
- **Fields**: Situation (Text), Problem (Text), Implication (List), Need-Payoff (Text)
- **Structure**: `custom` — maps to the SPIN questioning methodology
- **Description**: Framework de perguntas estratégicas para descoberta de necessidades

### 2. MEDDIC Qualification
- **Fields**: Metrics (List), Economic Buyer (Text), Decision Criteria (List), Decision Process (Text), Identify Pain (Text), Champion (Text)
- **Structure**: `custom` — comprehensive enterprise qualification
- **Description**: Qualificação enterprise com métricas, decisores e champion

### 3. Challenger Sale
- **Fields**: Teach (Text), Tailor (Text), Take Control (Text)
- **Structure**: `custom` — the Teach-Tailor-Take Control methodology
- **Description**: Ensinar, personalizar e assumir controlo da conversa comercial

### 4. ChAMP
- **Fields**: Challenges (Text), Authority (List), Money (Text), Prioritization (List)
- **Structure**: `custom` — challenge-first qualification
- **Description**: Qualificação começando pelos desafios do cliente

### 5. GPCTBA/C&I (HubSpot)
- **Fields**: Goals (Text), Plans (Text), Challenges (List), Timeline (Text), Budget (Number), Authority (Text), Consequences (Text), Implications (Text)
- **Structure**: `custom` — the most comprehensive qualification framework
- **Description**: Framework completo de qualificação com objetivos, planos e consequências

### 6. Sandler Pain Funnel
- **Fields**: Surface Pain (Text), Business Impact (Text), Personal Impact (Text), Commitment (Text)
- **Structure**: `PAS` — pain-driven discovery
- **Description**: Funil de dor para descobrir a motivação real de compra

## Implementation

### Single file change: `templateLibraryData.ts`

Insert the 6 new templates into the `LIBRARY_TEMPLATES` array after the existing `vendas` templates (after line 159, before the `// ── Sucesso ──` comment). Each template follows the exact same pattern as existing ones with:
- Unique `id` prefixed with `lib-`
- Category `vendas`
- Channel `email`, appropriate tone
- Fields with `description` strings in Portuguese
- Body text using structure block labels
- Subject line with template variables

## Files Changed

| File | Change |
|------|--------|
| `src/components/communication/templateLibraryData.ts` | Add 6 new sales framework templates to `LIBRARY_TEMPLATES` array |

## No Other Changes Needed

- The `TemplateLibraryDialog` already handles rendering any number of templates
- The Attio-style preview already shows field descriptions and format badges
- No new categories, types, or interfaces required

