

# Auto-associar cliente e contacto da oportunidade à proposta

## Diagnóstico

Quando uma proposta é criada a partir de uma oportunidade do pipeline, os campos `contact_id` e `company_id` da proposta ficam `NULL`, apesar de a oportunidade já ter esses dados preenchidos. Confirmado na BD: a oportunidade `fdf737cc` tem `contact_id` e `company_id`, mas a proposta `518035c3` tem ambos a `NULL`.

**Causa raiz:** O `handleSave` em `CreateProposalDialog.tsx` não copia `contact_id` nem `company_id` da oportunidade para o insert da proposta. O `useCreateProposal` também não aceita esses campos no `CreateProposalInput`.

## Solução

### 1. Expandir `CreateProposalInput` (`src/types/proposal.ts`)

Adicionar `contact_id` e `company_id` opcionais ao tipo `CreateProposalInput`.

### 2. Passar contact/company no `useCreateProposal` (`src/hooks/useProposals.ts`)

No `insertData`, incluir `contact_id` e `company_id` vindos do input.

### 3. Expandir `useOpportunity` query (`src/hooks/useOpportunities.ts`)

Incluir `contact_id` e `company_id` no select da oportunidade (actualmente só traz `lead`).

### 4. Auto-preencher no `CreateProposalDialog` (`src/components/proposals/CreateProposalDialog.tsx`)

No `handleSave`, ler `selectedOpportunity.contact_id` e `selectedOpportunity.company_id` e passá-los ao `createProposal.mutateAsync`.

## Ficheiros alterados

| Ficheiro | Alteração |
|---|---|
| `src/types/proposal.ts` | Adicionar `contact_id?` e `company_id?` a `CreateProposalInput` |
| `src/hooks/useProposals.ts` | Incluir `contact_id` e `company_id` no `insertData` |
| `src/hooks/useOpportunities.ts` | Adicionar `contact_id, company_id` ao select de `useOpportunity` |
| `src/components/proposals/CreateProposalDialog.tsx` | Passar `contact_id` e `company_id` da oportunidade no `handleSave` |

## Critérios de aceitação

- Proposta criada a partir de oportunidade herda automaticamente o contacto e empresa da oportunidade
- Campos `contact_id` e `company_id` preenchidos na BD após criação
- Detalhe da proposta mostra o cliente e contacto sem intervenção manual

