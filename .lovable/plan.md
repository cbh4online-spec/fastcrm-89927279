

# Melhorias na Importacao em Lote com IA

## Situacao Atual

O componente `BatchSKUImportDialog` ja existe em `src/components/products/BatchSKUImportDialog.tsx` e esta integrado no `ProductsList`. Ele permite:
- Upload de CSV com SKUs
- Pesquisa automatica via Firecrawl + IA (edge function `ai-product-assistant`)
- Selecao/desselecao de resultados
- Criacao em lote dos produtos seleccionados

## Melhorias Propostas

### 1. Input manual de SKUs (alem do CSV)
Adicionar um campo de texto onde o utilizador pode colar SKUs directamente (um por linha), sem precisar de criar um ficheiro CSV.

### 2. Processamento paralelo com controlo de rate-limit
Actualmente os SKUs sao processados um a um com 1.5s de delay. Melhorar para processar 2-3 em paralelo, mantendo respeito pelos limites da API.

### 3. Edicao inline dos resultados antes de criar
Permitir que o utilizador edite o nome, preco e categoria de cada produto directamente na lista de resultados, antes da criacao em lote.

### 4. Resumo pos-criacao com sugestoes de relacoes
Apos criar os produtos, mostrar um resumo com links para cada produto criado e disparar o sistema de sugestoes de cross-sell/up-sell (`usePostCreationSuggestions`).

### 5. Exportar relatorio de erros
Permitir download de CSV com os SKUs que falharam, para reprocessamento posterior.

## Detalhes Tecnicos

### Ficheiros a modificar:
- **`src/components/products/BatchSKUImportDialog.tsx`** -- Todas as melhorias de UI (textarea para input manual, edicao inline, resumo pos-criacao, export de erros)

### Alteracoes especificas:

**Input manual (textarea)**:
- Adicionar tab ou toggle entre "Carregar CSV" e "Colar SKUs"
- Textarea com placeholder indicando formato (um SKU por linha)
- Parser que limpa duplicados e linhas vazias

**Edicao inline**:
- Campos editaveis (nome, preco) directamente na linha de cada resultado com sucesso
- Os valores editados sao usados na criacao final

**Processamento paralelo**:
- Processar em batches de 2 SKUs simultaneamente com `Promise.allSettled`
- Manter delay de 1s entre batches

**Resumo pos-criacao**:
- Apos criacao, mostrar card com contagem de sucesso/erro
- Botao para exportar CSV com erros
- Integrar `PostCreationSuggestionsCard` para o ultimo produto criado

Nao sao necessarias alteracoes na base de dados nem novas edge functions -- toda a logica ja existe.
