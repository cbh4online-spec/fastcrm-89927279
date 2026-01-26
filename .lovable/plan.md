
# Plano: Adicionar Cliente e Condições às Propostas

## Contexto do Problema

Atualmente, a criação/edição de propostas tem as seguintes limitações:
1. **Cliente só via Oportunidade** - O cliente (contacto/empresa) só é obtido indiretamente através da oportunidade associada
2. **Sem seleção direta de cliente** - Não há forma de associar um contacto ou empresa diretamente à proposta
3. **Sem condições de proposta** - Não existem campos para:
   - Condições de pagamento (pronto pagamento, 30 dias, etc.)
   - Validade da proposta
   - Observações/termos legais

## Solução Proposta

### Fase 1: Alterações na Base de Dados

Adicionar novos campos à tabela `proposals`:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `contact_id` | uuid (FK) | Referência ao contacto |
| `company_id` | uuid (FK) | Referência à empresa |
| `payment_conditions` | text | Ex: "30 dias", "Pronto Pagamento" |
| `validity_days` | integer | Dias de validade (default 30) |
| `notes` | text | Observações/termos adicionais |
| `billing_address` | text | Morada de faturação |
| `billing_nif` | text | NIF para faturação |

### Fase 2: Secção de Cliente no Editor de Proposta

Criar uma nova aba/secção "Cliente" no `ProposalDetailDialog` com:

1. **Seletor de Tipo de Cliente**
   - Opção: "Pessoa Singular" (Contacto)
   - Opção: "Empresa"

2. **Pesquisa/Seleção de Cliente**
   - Dropdown com pesquisa para selecionar contacto ou empresa existente
   - Botão "Criar Novo" para adicionar cliente rapidamente

3. **Dados de Faturação**
   - Nome/Empresa (pré-preenchido)
   - NIF
   - Morada de faturação

### Fase 3: Secção de Condições no Editor

Adicionar na aba "Detalhes" ou nova aba "Condições":

1. **Condições de Pagamento**
   - Select com opções: Pronto Pagamento, 15 dias, 30 dias, 45 dias, 60 dias, 90 dias
   - Input para condições personalizadas

2. **Validade da Proposta**
   - Input numérico (dias)
   - Data de expiração calculada automaticamente

3. **Observações/Termos**
   - Textarea para notas adicionais
   - Opção de usar template de termos do workspace

### Fase 4: Atualização do Preview

Modificar `ProposalPreview.tsx` para mostrar:

```text
+-----------------------------------------------+
|  PROPOSTA COMERCIAL                           |
|  Para: [Nome do Cliente]                      |
|  NIF: [123456789]                             |
|  Data: 26/01/2026 | Válida até: 25/02/2026    |
+-----------------------------------------------+
|                                               |
|  [Conteúdo da proposta]                       |
|  [Tabela de itens/produtos]                   |
|                                               |
+-----------------------------------------------+
|  CONDIÇÕES                                    |
|  Pagamento: 30 dias                           |
|  [Observações adicionais]                     |
+-----------------------------------------------+
```

### Fase 5: Integração no Diálogo de Criação

Atualizar `CreateProposalDialog.tsx`:
- Adicionar seletor de cliente (independente da oportunidade)
- Quando oportunidade é selecionada, pré-preencher cliente se existir
- Permitir criar proposta sem oportunidade (cliente direto)

---

## Detalhes Técnicos

### Migração SQL

```sql
ALTER TABLE proposals 
  ADD COLUMN contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  ADD COLUMN company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  ADD COLUMN payment_conditions text,
  ADD COLUMN validity_days integer DEFAULT 30,
  ADD COLUMN notes text,
  ADD COLUMN billing_address text,
  ADD COLUMN billing_nif text;

CREATE INDEX idx_proposals_contact ON proposals(contact_id);
CREATE INDEX idx_proposals_company ON proposals(company_id);
```

### Novos Componentes

| Componente | Ficheiro | Descrição |
|------------|----------|-----------|
| ProposalClientSection | `src/components/proposals/ProposalClientSection.tsx` | Seletor de cliente |
| ProposalConditionsSection | `src/components/proposals/ProposalConditionsSection.tsx` | Condições de pagamento |
| ClientSearchSelect | `src/components/proposals/ClientSearchSelect.tsx` | Dropdown de pesquisa |

### Atualizações em Hooks

**`useProposals.ts`**:
- Atualizar `CreateProposalInput` com novos campos
- Atualizar `UpdateProposalInput` com novos campos
- Modificar queries para incluir dados do cliente (join com contacts/companies)

### Constantes para Condições

```typescript
// src/components/proposals/proposalConstants.ts
export const PAYMENT_CONDITIONS = [
  { value: 'pronto_pagamento', label: 'Pronto Pagamento' },
  { value: '15_dias', label: '15 dias' },
  { value: '30_dias', label: '30 dias' },
  { value: '45_dias', label: '45 dias' },
  { value: '60_dias', label: '60 dias' },
  { value: '90_dias', label: '90 dias' },
];

export const VALIDITY_DAYS_OPTIONS = [7, 15, 30, 45, 60, 90];
```

---

## Resumo das Alterações

| Tipo | Ficheiro | Ação |
|------|----------|------|
| DB | `proposals` table | Adicionar colunas client/conditions |
| Novo | `ProposalClientSection.tsx` | Criar componente |
| Novo | `ProposalConditionsSection.tsx` | Criar componente |
| Novo | `ClientSearchSelect.tsx` | Criar componente |
| Novo | `proposalConstants.ts` | Criar constantes |
| Editar | `ProposalDetailDialog.tsx` | Adicionar tabs Cliente/Condições |
| Editar | `CreateProposalDialog.tsx` | Adicionar seleção cliente |
| Editar | `ProposalPreview.tsx` | Mostrar cliente e condições |
| Editar | `useProposals.ts` | Atualizar types e queries |
| Editar | `src/types/proposal.ts` | Atualizar interfaces |

---

## Resultado Esperado

Após implementação:
1. Utilizador pode associar contacto ou empresa diretamente à proposta
2. Condições de pagamento e validade são configuráveis
3. Preview mostra cliente e condições de forma profissional
4. Propostas podem ser criadas sem oportunidade (cliente direto)
5. NIF e morada de faturação são guardados para emissão de documentos
