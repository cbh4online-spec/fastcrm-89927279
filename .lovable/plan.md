

# Criar Produtos na Loja via IA (SKU ou Fotografia)

## Objetivo
Adicionar a capacidade de criar produtos diretamente na pagina de administracao da loja (`StoreProductsAdminPage`) usando IA, atraves de duas vias: pesquisa por SKU ou analise de fotografia. O produto e criado automaticamente com `store_published: true`.

## Como vai funcionar

O administrador da loja tera um novo botao "Criar com IA" que abre um dialogo com duas abas:

1. **Por SKU** -- Inserir o codigo SKU, a IA pesquisa na internet e preenche automaticamente nome, descricao, preco, categoria, imagens e especificacoes. O utilizador revisa e confirma.

2. **Por Fotografia** -- Fazer upload de uma foto do produto, a IA analisa a imagem e identifica o produto, preenchendo os mesmos campos. O utilizador revisa e confirma.

Em ambos os casos, o produto e criado na base de dados ja publicado na loja.

## Seccao Tecnica

### Ficheiros a criar

| Ficheiro | Descricao |
|---|---|
| `src/components/store/StoreQuickProductDialog.tsx` | Dialogo principal com duas abas (SKU / Fotografia) para criacao rapida de produtos via IA |

### Ficheiros a modificar

| Ficheiro | Alteracao |
|---|---|
| `src/pages/StoreProductsAdminPage.tsx` | Adicionar botao "Criar com IA" e importar o novo dialogo |
| `supabase/functions/ai-product-assistant/index.ts` | Adicionar modo `image-to-product` que analisa uma foto e devolve dados do produto (nome, descricao, categoria, preco estimado) |

### Detalhes de implementacao

**1. Edge Function -- novo modo `image-to-product`**
- Recebe uma imagem base64
- Usa Gemini Flash com visao para analisar o produto na foto
- Devolve: nome sugerido (comercial + tecnico), descricao, categoria provavel, faixa de preco estimada, especificacoes visiveis
- Formato de resposta identico ao `sku-search` para reutilizar a logica existente

**2. Componente `StoreQuickProductDialog`**
- Aba SKU: reutiliza a logica do `useProductAIAssistant.searchBySKU` existente
- Aba Fotografia: usa o novo modo `image-to-product` da edge function
- Formulario de revisao com campos pre-preenchidos (nome, preco, descricao, categoria)
- Botao "Criar e Publicar" que insere o produto na tabela `products` com `store_published: true` e `status: active`
- Tras a criacao, invalida as queries da lista de produtos da loja

**3. Pagina de Administracao**
- Novo botao ao lado da barra de pesquisa com icone de Sparkles + "Criar com IA"
- Abre o `StoreQuickProductDialog`

### Fluxo do utilizador

```text
[Admin da Loja]
     |
     v
[Clica "Criar com IA"]
     |
     v
[Escolhe aba: SKU ou Fotografia]
     |                    |
     v                    v
[Insere SKU]      [Faz upload de foto]
     |                    |
     v                    v
[IA pesquisa]     [IA analisa imagem]
     |                    |
     v                    v
[Pre-visualizacao dos dados encontrados]
     |
     v
[Revisa nome, preco, descricao]
     |
     v
[Clica "Criar e Publicar"]
     |
     v
[Produto criado e publicado na loja]
```

### Componentes reutilizados
- `useProductAIAssistant` (hook existente) para pesquisa SKU
- Logica de upload de imagem similar ao `StoreVisualSearch`
- `useCreateProduct` (hook existente) para inserir o produto na BD
