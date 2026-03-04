

# Imagens 3D no Carrossel de Categorias C2C

## Contexto
Atualmente, o carrossel de categorias usa emojis (`cat.icon || "📦"`). O objetivo é substituir por imagens 3D geradas por IA, tornando o visual mais profissional e apelativo.

## Alterações

### 1. Migração SQL — Adicionar `image_url` à tabela `c2c_categories`
```sql
ALTER TABLE c2c_categories ADD COLUMN IF NOT EXISTS image_url text;
```

### 2. Edge Function — Gerar imagens 3D para categorias
Criar uma nova edge function `ai-category-image` (ou adicionar modo ao `ai-c2c-listing-assistant`) que:
- Recebe o nome da categoria
- Usa `google/gemini-3-pro-image-preview` para gerar uma imagem 3D isométrica do ícone da categoria (ex: "3D isometric icon of electronics category, white background, minimal")
- Faz upload ao bucket `c2c-photos` e retorna o URL público
- Pode ser chamada em bulk para gerar todas as categorias de uma vez

### 3. Hook — Gerar imagem da categoria
Adicionar ao `useC2CListings.ts` (ou novo hook) uma mutation `useGenerateCategoryImage` que chama a edge function e atualiza o `image_url` na tabela `c2c_categories`.

### 4. UI — Atualizar `CategoryCarousel` em ambas as páginas
**Ficheiros:** `C2CMarketplace.tsx` e `C2CPublicMarketplace.tsx`

Substituir:
```tsx
<span className="text-2xl">{cat.icon || "📦"}</span>
```
Por:
```tsx
{cat.image_url ? (
  <img src={cat.image_url} alt={cat.name} className="w-12 h-12 object-contain" />
) : (
  <span className="text-2xl">{cat.icon || "📦"}</span>
)}
```

### 5. Botão admin para gerar imagens em bulk
Na página de gestão de categorias (se existir) ou no dashboard C2C, adicionar um botão "Gerar imagens 3D" que percorre todas as categorias sem `image_url` e gera as imagens via IA.

### 6. Auto-geração na criação de categoria
Quando uma nova categoria é criada, chamar automaticamente a geração de imagem 3D em background.

## Ficheiros a alterar
- Migração SQL: coluna `image_url`
- `supabase/functions/ai-c2c-listing-assistant/index.ts` — modo `generate-category-image`
- `src/pages/c2c/C2CMarketplace.tsx` — CategoryCarousel com imagem
- `src/pages/c2c/C2CPublicMarketplace.tsx` — CategoryCarousel com imagem
- `src/hooks/useC2CListings.ts` — mutation para gerar imagem de categoria

