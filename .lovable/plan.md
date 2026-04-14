

# Descontos e Promoções em Contratos de Renovação

## Diagnóstico

O sistema de renovações não tem suporte para descontos temporários. A tabela `renewal_items` tem apenas `unit_price` e `qty` — sem campos de desconto, data de início/fim da promoção, ou histórico. Não é possível registar cenários como "50% durante 3 meses" sem alterar manualmente o preço (perdendo o valor original).

## Solução: Tabela de Descontos por Contrato

Criar uma tabela `renewal_discounts` que gere promoções temporárias ou permanentes, aplicadas ao contrato ou a itens específicos.

### 1. Migration — `renewal_discounts`

```sql
CREATE TABLE public.renewal_discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  contract_id uuid NOT NULL REFERENCES renewal_contracts(id) ON DELETE CASCADE,
  renewal_item_id uuid REFERENCES renewal_items(id) ON DELETE CASCADE, -- NULL = aplica ao contrato todo
  name text NOT NULL,                    -- ex: "Desconto Onboarding 50%"
  discount_type text NOT NULL DEFAULT 'percentage', -- 'percentage' | 'fixed_amount'
  discount_value numeric(12,2) NOT NULL, -- 50 (%) ou 63.50 (€)
  start_date date NOT NULL,
  end_date date,                         -- NULL = permanente
  max_cycles integer,                    -- ex: 3 (aplica-se a 3 ciclos de faturação)
  cycles_used integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

- RLS com `is_workspace_member` + `is_super_admin`
- Índices em `contract_id` e `is_active`

### 2. Atualizar trigger `sync_renewal_contract_mrr`

O trigger deve considerar descontos ativos ao calcular o `total_mrr`:
- Somar descontos percentuais e fixos ativos (onde `is_active = true` AND `(end_date IS NULL OR end_date >= CURRENT_DATE)` AND `(max_cycles IS NULL OR cycles_used < max_cycles)`)
- Aplicar ao valor base dos itens

### 3. UI — Separador/Secção "Descontos" no detalhe do contrato

Na `RenewalDetailPage.tsx`, adicionar:
- Listagem de descontos ativos e expirados com badges visuais
- Botão "Adicionar Desconto" que abre dialog com:
  - Nome da promoção
  - Tipo: Percentagem ou Valor Fixo
  - Valor do desconto
  - Item específico (opcional) ou contrato todo
  - Data início / Data fim (opcional)
  - Nº máximo de ciclos (opcional)
  - Notas
- Indicador visual no KPI de MRR mostrando valor original vs. valor com desconto

### 4. Impacto nos KPIs

- **MRR**: mostrar valor base riscado + valor efetivo com desconto
- **ARR**: recalculado com desconto
- **LTV**: usar valor efetivo (com desconto) para o período promocional + valor base para restante

### 5. Integração com Faturação

Quando a edge function `generate-renewal-invoice` gerar faturas, incluir linha de desconto com referência à promoção.

## Ficheiros Afetados

| Ficheiro | Alteração |
|---|---|
| Migration SQL | Tabela `renewal_discounts` + trigger atualizado |
| `src/types/renewal.ts` | Tipos `RenewalDiscount`, `CreateRenewalDiscountInput` |
| `src/hooks/useRenewals.ts` | Hooks CRUD para descontos |
| `src/pages/RenewalDetailPage.tsx` | Secção de descontos + KPIs atualizados |
| `src/components/renewals/CreateRenewalDiscountDialog.tsx` | Novo dialog |

## Critérios de Aceitação

- Criar desconto "50% durante 3 meses" para a Blecksen e ver refletido no MRR
- Descontos expirados (por data ou ciclos) deixam de afetar cálculos automaticamente
- Histórico de promoções visível no contrato
- Fatura gerada reflete o desconto como linha separada

