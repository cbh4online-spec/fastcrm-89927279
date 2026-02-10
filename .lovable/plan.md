
# Fase 3 -- Mega-Menu Premium e Categorias Visuais

## Resumo

Esta fase transforma a navegacao da loja em dois pontos: (1) o Mega-Menu no header ganha layout expandido com imagens de categorias e produtos sugeridos, e (2) o Carousel de categorias passa de pills simples para cards visuais com imagem de fundo.

---

## 1. Migracao de Base de Dados

A tabela `store_categories` nao tem coluna `image_url`. E necessario adicioná-la para suportar categorias visuais com imagem de fundo.

**SQL:**
```sql
ALTER TABLE store_categories ADD COLUMN image_url text;
```

Tambem atualizar a interface `StoreCategory` em `useStoreProducts.ts` para incluir `image_url`.

---

## 2. Mega-Menu Expandido (StoreHeader.tsx)

Substituir o dropdown simples de categorias por um mega-menu com layout de 2 zonas:

```text
+----------------------------+--------------------+
|  Lista de Categorias       |  Produto Top       |
|  (com imagem miniatura)    |  (card do produto  |
|  - Categoria 1             |   mais vendido da  |
|  - Categoria 2             |   categoria hover) |
|  - Categoria 3             |                    |
|  ...                       |                    |
+----------------------------+--------------------+
```

**Detalhes:**
- Largura expandida: `w-[500px]` em vez de `w-[300px]`
- Coluna esquerda: lista de categorias com imagem miniatura (se disponivel) e contagem de produtos
- Coluna direita: card de produto sugerido (primeiro produto featured da categoria em hover)
- Estado de hover nas categorias com highlight visual
- Botao "Ver Todos" no final da lista
- Aceitar props adicionais: `products` para alimentar o produto sugerido por categoria

**Novas props no StoreHeader:**
- `products?: StoreProduct[]` -- para mostrar produto sugerido no mega-menu

---

## 3. Categorias Visuais (StoreCategoryCarousel.tsx)

Transformar as pills de texto em cards visuais com imagem de fundo:

**Antes:** Botoes pill (`rounded-full`, texto apenas)
**Depois:** Cards retangulares com:
- Imagem de fundo da categoria (se existir) com overlay gradiente escuro
- Nome da categoria centrado em branco sobre a imagem
- Fallback para gradiente colorido se nao tiver imagem
- Tamanho: `w-[140px] h-[80px]` com `rounded-xl`
- Scroll horizontal mantido com snap points
- Estado ativo com borda primary e escala ligeiramente maior

---

## Seccao Tecnica

### Migracao
- Adicionar coluna `image_url text` na tabela `store_categories`

### Ficheiros a Modificar

1. **`src/hooks/useStoreProducts.ts`**
   - Adicionar `image_url: string | null` na interface `StoreCategory`

2. **`src/components/store/StoreHeader.tsx`**
   - Aceitar nova prop `products`
   - Expandir `NavigationMenuContent` para layout 2 colunas
   - Estado local `hoveredCategoryId` para mostrar produto sugerido
   - Logica para encontrar produto featured/top da categoria em hover

3. **`src/components/store/sections/StoreCategoryCarousel.tsx`**
   - Substituir pills por cards visuais com imagem de fundo
   - Usar `image_url` da categoria para background
   - Fallback com gradientes coloridos (reutilizar paleta do `StoreCategoryGrid`)
   - Scroll com snap-x

4. **`src/pages/store/StorePage.tsx`**
   - Passar `allProducts` ao `StoreHeader` via nova prop `products`

### Sem novas dependencias
- Tudo com Tailwind, framer-motion e Radix NavigationMenu existentes
