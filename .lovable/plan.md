

# Plano: Tabela de Cotação Bulk para RFQ

## Resumo

Criar um modo de registo de cotações em tabela (spreadsheet-like) que permite preencher todos os itens de um RFQ para um fornecedor de uma vez, com edição inline, validação e gravação em batch via backend functions.

---

## 1. Migração de Base de Dados

A tabela `rfq_quotes` já existe com os campos necessários (unit_price, discount_percent, vat_percent, lead_time_days, min_order_qty, pack_size, notes). Faltam:

- Coluna `status` (text, default 'draft') -- para draft/submitted
- Coluna `submitted_at` (timestamptz, nullable)
- Coluna `updated_at` (timestamptz, default now())
- UNIQUE constraint em `(workspace_id, rfq_id, rfq_item_id, supplier_id)` -- para suportar upsert

```sql
ALTER TABLE public.rfq_quotes
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS uq_rfq_quotes_item_supplier
  ON public.rfq_quotes(workspace_id, rfq_id, rfq_item_id, supplier_id);
```

---

## 2. Edge Functions (3 funções)

### A. `rfq-get-supplier-quote-sheet`
- Input: `rfq_id`, `supplier_id` (via JWT auth, valida workspace membership)
- Output: lista de rfq_items com produto/SKU/qty + quotes existentes desse supplier pré-preenchidas
- Usa service role para queries, valida que o user pertence ao workspace

### B. `rfq-upsert-quote-sheet`
- Input: `rfq_id`, `supplier_id`, `rows[]` (cada row tem rfq_item_id + campos editáveis)
- Faz upsert em batch usando o UNIQUE constraint
- Chunking de 200 linhas por transação
- Retorna `{ created, updated, errors[] }`

### C. `rfq-submit-quote-sheet`
- Input: `rfq_id`, `supplier_id`
- Valida que todos os itens têm unit_price > 0
- UPDATE status = 'submitted', submitted_at = now()
- UPDATE rfq_suppliers SET status = 'responded', responded_at = now()

---

## 3. Componente UI: `RFQQuoteSheetDialog`

Um Dialog/Drawer grande (quase fullscreen) com:

### A. Seletor de Fornecedor
- Dropdown com apenas os fornecedores convidados (de `rfq_suppliers`)
- Ao selecionar, invoca `rfq-get-supplier-quote-sheet` e popula a tabela

### B. Tabela Spreadsheet
- 1 linha por rfq_item
- Colunas read-only: #, Produto, SKU, Qtd
- Colunas editáveis (inputs inline): Preço Unitário, Desconto %, IVA %, Lead Time, MOQ
- Colunas calculadas: Subtotal, Total c/ IVA
- Navegação Tab/Enter entre células editáveis
- Suporte Ctrl+V para colar múltiplos valores
- Estado local em `useState` com array de rows

### C. Ações Rápidas (toolbar)
- "Aplicar IVA a todos" -- popover com input, aplica a todas as linhas
- "Aplicar Lead Time a todos"
- "Aplicar Desconto a todos"

### D. Barra de Estado + Botões
- Indicador "X alterações por guardar" (comparação com dados originais)
- "Guardar Rascunho" -- invoca `rfq-upsert-quote-sheet` com status=draft
- "Submeter Cotação" -- invoca `rfq-upsert-quote-sheet` + `rfq-submit-quote-sheet`
- "Cancelar"
- Auto-save debounced a cada 5s (opcional, usando `useDebounce`)

### E. Validação
- Erros por célula (borda vermelha + tooltip)
- Resumo no topo: "3 erros encontrados"
- Preço > 0 obrigatório para submeter; IVA 0-100; Lead time >= 0; MOQ >= 1 se preenchido

---

## 4. Integração na RFQDetailPage

- Adicionar botão "Registar Cotação (Tabela)" ao lado do existente
- State `showQuoteSheet` para abrir o novo dialog
- Na tabela de fornecedores: mostrar badge Draft/Submitted e contagem de linhas cotadas/total
- Manter modal antigo como fallback

---

## 5. Hook `useRFQQuoteSheet`

Encapsula:
- Chamada a `rfq-get-supplier-quote-sheet`
- Chamada a `rfq-upsert-quote-sheet`
- Chamada a `rfq-submit-quote-sheet`
- Invalidação de queries relevantes (`rfq-quotes`, `rfq-suppliers`)

---

## 6. Ficheiros a criar/modificar

| Ficheiro | Ação |
|---|---|
| Migração SQL | Adicionar status, submitted_at, updated_at + UNIQUE index |
| `supabase/functions/rfq-get-supplier-quote-sheet/index.ts` | Criar |
| `supabase/functions/rfq-upsert-quote-sheet/index.ts` | Criar |
| `supabase/functions/rfq-submit-quote-sheet/index.ts` | Criar |
| `src/hooks/useRFQQuoteSheet.ts` | Criar |
| `src/components/procurement/RFQQuoteSheetDialog.tsx` | Criar |
| `src/pages/procurement/RFQDetailPage.tsx` | Modificar (botão + badge suppliers) |
| `supabase/config.toml` | Adicionar verify_jwt=false para as 3 novas funções |

---

## Segurança
- Todas as edge functions validam JWT e membership do workspace
- RLS existente em `rfq_quotes` já protege por workspace_id
- O UNIQUE constraint garante integridade no upsert

