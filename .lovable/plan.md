
# Editar Produtos na Loja e Melhorar Visibilidade de Custos/Margens

## Objetivo

Adicionar funcionalidades de edicao inline de produtos na pagina de gestao da loja, um botao de sugestao de preco por produto, e mostrar o preco de custo e margem para melhor acompanhamento.

## O Que Muda

### 1. Edicao de Produtos Inline

Cada linha da tabela de produtos passara a ter um botao "Editar" que abre um dialogo (Dialog) com os campos editaveis:

- Nome
- SKU
- Categoria
- Preco de venda (base_price)
- Preco de custo (direct_cost)
- Custo operacional (operational_cost)
- Descricao curta
- Condicao (novo/usado/recondicionado)
- Stock (quantidade e estado)
- Imagens (visualizacao, sem upload neste dialogo)

O dialogo reutiliza a mutation `updateProduct` ja existente na pagina.

### 2. Colunas de Custo e Margem na Tabela

Novas colunas visiveis na tabela de produtos:

| Coluna | Dados |
|---|---|
| Custo | `direct_cost` do produto |
| Margem | Calculo automatico: `((base_price - direct_cost) / base_price) * 100` com badge colorido (verde >30%, amarelo 15-30%, vermelho <15%) |

A query de produtos sera atualizada para incluir `direct_cost` e `operational_cost`.

### 3. Botao de Sugestao de Preco por Produto

Cada produto tera um botao com icone de lampada que invoca a edge function `ai-pricing-optimizer` no modo `optimize-table` ou diretamente gera uma sugestao para aquele produto especifico. Ao clicar:

- Mostra um pequeno popover/toast com o preco sugerido e o raciocinio
- Opcao de "Aplicar" ou "Descartar" diretamente

## Seccao Tecnica

### Ficheiro: `src/pages/StoreProductsAdminPage.tsx`

**Interface `ProductStoreData`:** Adicionar campos `direct_cost`, `operational_cost`, `short_description`, `stock_status`, `stock_quantity`, `condition`, `product_type`.

**Query de produtos:** Incluir os novos campos no select.

**Nova coluna "Custo":** Depois da coluna "Preco", mostra `direct_cost` formatado ou "--".

**Nova coluna "Margem":** Calculo inline com badge colorido baseado na percentagem.

**Botao "Editar":** Nova coluna de acoes com icone de edicao. Abre um `Dialog` com formulario pre-preenchido. Ao guardar, chama `updateProduct.mutate()`.

**Botao "Sugestao IA":** Icone de lampada por produto que invoca a edge function `ai-pricing-optimizer` com os dados do produto e mostra o resultado num popover.

### Componente novo: `src/components/store/StoreProductEditDialog.tsx`

Dialogo de edicao com:
- Formulario com campos editaveis (nome, sku, precos, custos, descricao, condicao, stock)
- Botao de guardar que chama a mutation
- Botao de sugestao de preco integrado no dialogo

### Resumo de ficheiros

| Ficheiro | Alteracao |
|---|---|
| `src/pages/StoreProductsAdminPage.tsx` | Adicionar colunas custo/margem, botao editar, botao sugestao IA, expandir query |
| `src/components/store/StoreProductEditDialog.tsx` | Novo dialogo de edicao de produto |
