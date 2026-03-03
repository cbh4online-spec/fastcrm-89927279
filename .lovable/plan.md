

# Melhorar Sugestão de Fornecedor nas Necessidades de Compra

## Situação Atual
A edge function `procurement-needs-recompute` já calcula e armazena o ranking de fornecedores em `suggestion_json.ranking` e `recommended_supplier_id`. No entanto, a UI mostra apenas o nome do fornecedor recomendado de forma estática — sem dropdown dos top 3 nem possibilidade de escolher outro.

## Plano

### 1. Coluna "Fornecedor" na tabela com dropdown top 3
No `NeedsBoardTable.tsx`, substituir o texto estático do fornecedor por um **Popover/DropdownMenu** que:
- Mostra o fornecedor recomendado (#1) com preço
- Ao clicar, abre lista dos top 3 do `suggestion_json.ranking` com score, preço e lead time
- Permite "Escolher este" para atualizar o `recommended_supplier_id` da need

Adicionar callback `onChooseSupplier(needId, supplierId, unitPrice)` às props da tabela.

### 2. Hook: mutation para atualizar fornecedor escolhido
No `useProcurementNeeds.ts`, adicionar `useUpdateNeedSupplier` que faz update de `recommended_supplier_id` e `suggested_unit_price` na tabela `procurement_needs`.

### 3. Drawer: integrar SupplierSuggestionCard
No `NeedDetailDrawer.tsx`, substituir a lista manual de fornecedores pelo componente `SupplierSuggestionCard` existente, passando o ranking do `suggestion_json` e os callbacks de escolha.

### 4. Page: ligar tudo
No `ProcurementNeedsBoardPage.tsx`, instanciar a mutation e passar o handler `onChooseSupplier` à tabela.

## Ficheiros a alterar
- `src/components/procurement/needs/NeedsBoardTable.tsx` — dropdown fornecedor top 3
- `src/components/procurement/needs/NeedDetailDrawer.tsx` — usar `SupplierSuggestionCard`
- `src/hooks/useProcurementNeeds.ts` — adicionar `useUpdateNeedSupplier`
- `src/pages/procurement/ProcurementNeedsBoardPage.tsx` — ligar mutation

