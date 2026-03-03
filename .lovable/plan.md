

# Geração Automática de PO a partir de RFQ Adjudicado — Melhorias UI

## Estado Atual
O backend já está **100% implementado**: a edge function `rfq-award-and-create-pos` cria POs agrupados por fornecedor, liga ao `project_id` e `rfq_id`, atualiza procurement needs e project items. O que falta é visibilidade no frontend.

## Plano

### 1. Melhorar `PurchaseOrdersPage.tsx` — Mostrar RFQ e Projeto nas POs

- Alterar a query no hook `usePurchaseOrders` para incluir joins: `rfqs:rfq_id(title, rfq_number)` e `procurement_projects:project_id(name)`
- Adicionar colunas "RFQ" e "Projeto" na tabela de POs com badges clicáveis que navegam para o detalhe do RFQ/Projeto
- Adicionar indicador visual (ícone Trophy) quando a PO foi gerada automaticamente de um RFQ

### 2. Navegação pós-adjudicação no `RFQDetailPage.tsx`

- Após o `awardRFQ.mutate` ter sucesso, mostrar um toast com botão "Ver Ordens de Compra" que navega para `/dashboard/procurement/orders`
- Alterar o `onSuccess` do `useAwardRFQ` no hook para retornar os `purchase_order_ids` e permitir navegação

### 3. Secção "POs Geradas" no `RFQDetailPage.tsx`

- Quando o RFQ está em estado `awarded`, mostrar uma nova Card abaixo do dashboard de comparação listando as POs geradas a partir deste RFQ
- Query: `purchase_orders` filtradas por `rfq_id`
- Mostrar: PO number, fornecedor, valor total, status, link para detalhe

### Ficheiros a Editar
- `src/hooks/useProcurement.ts` — expandir select do `usePurchaseOrders` com joins RFQ/projeto
- `src/hooks/useRFQ.ts` — ajustar `onSuccess` do `useAwardRFQ` para suportar navegação
- `src/pages/procurement/PurchaseOrdersPage.tsx` — adicionar colunas RFQ e Projeto
- `src/pages/procurement/RFQDetailPage.tsx` — adicionar secção de POs geradas e navegação pós-award

Sem alterações de DB — todos os campos já existem.

