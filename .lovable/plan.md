
# Gerar descricoes com IA para Produto e Loja

## O que muda
Adicionar botoes "Gerar com IA" junto aos campos de descricao, tanto na criacao/edicao de produtos como nas configuracoes da loja. A IA gera automaticamente textos otimizados para SEO.

## Onde aparecem os botoes

### 1. Descricao do Produto (CreateProductDialog)
- Botao com icone Sparkles ao lado do label "Descricao curta"
- Usa o modo `generate-description` ja existente no `ai-product-assistant`
- Precisa do nome do produto preenchido para funcionar
- Preenche automaticamente o campo de descricao

### 2. Descricao da Loja (StoreSettingsPage)
- Botao com icone Sparkles ao lado do label "Descricao"
- Chama um novo modo `generate-store-description` no edge function
- Usa o nome da loja e categoria de produtos para gerar descricao SEO
- Preenche automaticamente o campo store_description

## Seccao Tecnica

### Ficheiros a alterar

| Ficheiro | Alteracao |
|---|---|
| `src/components/products/CreateProductDialog.tsx` | Adicionar botao IA junto ao label "Descricao curta" que chama `generateDescription` do hook existente `useProductAIAssistant` |
| `src/pages/StoreSettingsPage.tsx` | Adicionar botao IA junto ao label "Descricao" que invoca `ai-product-assistant` com modo `generate-store-description` |
| `supabase/functions/ai-product-assistant/index.ts` | Adicionar modo `generate-store-description` que gera descricao SEO para a loja |

### Logica do botao (ambos os casos)

```text
1. Utilizador clica no botao Sparkles
2. Valida que o campo nome esta preenchido
3. Mostra estado de loading no botao
4. Chama a edge function com os dados disponiveis
5. Preenche o campo de descricao com o resultado
6. Toast de sucesso
```

### Novo modo na edge function

O modo `generate-store-description` recebe `storeName` e opcionalmente `category`, e devolve uma descricao otimizada para SEO da loja (meta description, max 160 caracteres + descricao completa).

### UX dos botoes
- Botao pequeno inline ao lado do Label com icone Sparkles
- Texto: "Gerar com IA"
- Estado loading com Loader2 animado
- Desativado se o campo nome estiver vazio
- Nao substitui texto existente sem confirmacao (se ja houver texto, pergunta se quer substituir via toast)
