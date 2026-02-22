

# Fix: Erro na pesquisa de SKU - `serve is not defined`

## Diagnostico

A funcao backend `ai-product-assistant` esta a falhar com o erro **`ReferenceError: serve is not defined`**. O problema e que o codigo usa `serve(...)` na linha 133, mas deveria usar `Deno.serve(...)` que e a API correcta para funcoes backend.

## Solucao

Alterar a linha 133 do ficheiro `supabase/functions/ai-product-assistant/index.ts`:

- **De:** `serve(async (req) => {`
- **Para:** `Deno.serve(async (req) => {`

Esta e uma correcao de uma unica linha que vai resolver o erro em todas as funcionalidades deste endpoint (pesquisa SKU, sugestoes, geracao de descricao, analise de preco, etc.).

