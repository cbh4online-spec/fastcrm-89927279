
# Melhorar Criacao Automatica de Produtos com IA

## Problema Atual

O dialogo de criacao rapida de produtos com IA (`StoreQuickProductDialog`) tem duas lacunas:

1. **Imagens nao sao guardadas corretamente**
   - No modo SKU: as imagens encontradas sao URLs externos que podem desaparecer. Nao sao carregadas para o storage.
   - No modo Fotografia: a imagem enviada pelo utilizador nao e guardada no produto criado (o campo `images` fica vazio).

2. **Sem campos de stock** — o produto e criado sem quantidade em stock, estado de stock ou indicacao de controlo de inventario.

## Solucao

### 1. Persistir Imagens no Storage

Ao criar o produto, as imagens (externas do SKU ou a foto enviada) serao carregadas para o bucket `product-images` do storage antes de gravar o produto. Isto garante que as imagens ficam permanentes e sob o nosso controlo.

**Fluxo:**

```text
Modo SKU: URLs externos encontrados pela IA
  -> Fetch de cada imagem
  -> Upload para bucket product-images
  -> Guardar URLs do storage no produto

Modo Fotografia: Ficheiro enviado pelo utilizador
  -> Upload direto para bucket product-images
  -> Guardar URL do storage no produto
```

### 2. Adicionar Campos de Stock ao Formulario

Antes de criar o produto, o utilizador pode definir:

| Campo | Tipo | Default | Descricao |
|---|---|---|---|
| stock_status | select | available | Estado do stock (Disponivel, Limitado, Sob Encomenda, Esgotado) |
| stock_quantity | number | (vazio) | Quantidade em stock |
| track_stock | checkbox | false | Controlar inventario automaticamente |

### 3. Layout do Formulario Atualizado

O formulario de preview do produto passara a ter:

```text
[Imagens do produto (thumbnails)]       <- ja existe, mas agora funcional em ambos os modos
[Nome]                                  <- ja existe
[Preco]  [Categoria]                    <- ja existe
[Stock]  [Quantidade]  [Controlar?]     <- NOVO
[Descricao]                             <- ja existe
[Criar e Publicar]                      <- ja existe
```

## Seccao Tecnica

### Ficheiro: `src/components/store/StoreQuickProductDialog.tsx`

**Alteracoes:**

1. Adicionar campos ao `ProductPreview`:
   - `stock_status: string` (default: "available")
   - `stock_quantity: number | null` (default: null)
   - `track_stock: boolean` (default: false)

2. No modo fotografia (`handleImageUpload`):
   - Guardar o base64/file reference para upload posterior
   - Mostrar a imagem no preview do produto

3. Novo `handleCreate` melhorado:
   - Se existem imagens externas (SKU): fazer fetch e upload para `product-images` bucket
   - Se existe foto do utilizador: upload direto para `product-images` bucket
   - Guardar os URLs do storage no campo `images` do produto
   - Incluir `stock_status`, `stock_quantity` e `track_stock` na criacao

4. Adicionar ao formulario:
   - Select para `stock_status` com as 4 opcoes (Disponivel, Limitado, Sob Encomenda, Esgotado)
   - Input numerico para `stock_quantity`
   - Checkbox para `track_stock`

### Ficheiro: `supabase/functions/ai-product-assistant/index.ts`

Sem alteracoes necessarias — a funcao ja retorna imagens no modo `sku-search` e dados completos no modo `image-to-product`.

### Resumo

| Ficheiro | Alteracao |
|---|---|
| `src/components/store/StoreQuickProductDialog.tsx` | Adicionar upload de imagens para storage, campos de stock (status, quantidade, controlo), e melhorar fluxo de criacao |

Nenhuma migracao SQL necessaria — as colunas `stock_status`, `stock_quantity` e `track_stock` ja existem na tabela `products`.
