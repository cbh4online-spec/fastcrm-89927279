## Diagnóstico

O campo "Stock Mínimo" já existe na BD (`products.low_stock_threshold`, integer NOT NULL DEFAULT 5) e está mesmo a ser apresentado no separador **Stock** da ficha de produto, no card "Alerta Mínimo" — mas só em modo leitura. O utilizador não consegue editá-lo a partir da ficha.

Também já é usado por:
- Trigger de alerta de stock baixo (`stock_quantity <= low_stock_threshold`)
- Analytics da loja
- OCR de criação de produto

## Decisão

Tornar o campo "Alerta Mínimo" editável diretamente no card do separador **Stock**, com gravação imediata (inline save), sem abrir diálogo.

## Plano de implementação

**1. `src/components/products/ProductStockTab.tsx`**

- Substituir o card de leitura "Alerta Mínimo" por um pequeno editor inline:
  - Input numérico (min=0) com valor inicial = `product.low_stock_threshold ?? 5`
  - Botão "Guardar" aparece quando o valor é diferente do persistido
  - Estado local + toast de sucesso/erro
- Adicionar mutation com `useMutation` (TanStack Query):
  - `UPDATE products SET low_stock_threshold = X WHERE id = product.id AND workspace_id = ws`
  - Invalidar `["product", productId]` e `["products"]`
- Manter a lógica `isLow` a usar o novo valor em tempo real.

**2. Tipagem do prop**

- Já está em `ProductStockTabProps.low_stock_threshold`. Sem alterações.

**3. Sem migrações**

- Coluna já existe e tem default seguro. Sem alterações de BD.

## Critérios de aceitação

- Na ficha de produto → Stock, o card "Alerta Mínimo" mostra um input editável com o valor atual.
- Alterar e gravar persiste em `products.low_stock_threshold`.
- O card "Disponível" e o banner de "Stock baixo" reagem ao novo valor sem reload.
- Toast de confirmação ao gravar; toast de erro em caso de falha.
- Validação: inteiro ≥ 0 (vazio = 0).
- RLS já protege escrita por workspace — sem nova policy necessária.

## Riscos

- Nenhum significativo. Mudança isolada no componente.