

# Indicadores Inteligentes na Lista de Produtos

## Objetivo

Adicionar indicadores visuais (summary cards + filtros inteligentes + ícones inline) que identifiquem rapidamente problemas e oportunidades no catálogo de produtos.

## Alterações

### 1. Summary Cards — barra de indicadores acima da tabela

**Ficheiro**: `src/components/products/ProductsList.tsx`

Adicionar uma barra de 6 cards compactos entre o Toolbar e a tabela, calculados com `useMemo` sobre `products`:

| Card | Lógica | Cor |
|------|--------|-----|
| **Total** | `products.length` | neutro |
| **Sem preço** | `base_price === 0` | vermelho |
| **Sem custo** | `direct_cost === null \|\| direct_cost === 0` | amarelo |
| **Margem negativa** | `direct_cost > base_price` | vermelho |
| **Margem baixa (<15%)** | `margin > 0 && margin < 15` | amarelo |
| **Sem imagem** | `!images \|\| images.length === 0` | cinza |

Cada card é clicável — ao clicar, activa o filtro inteligente correspondente no sidebar.

### 2. Expandir filtros inteligentes no sidebar

**Ficheiro**: `src/components/products/ProductsList.tsx`

Adicionar ao grupo "Filtros Inteligentes" existente (linhas 313-321):

- `smart_no_price` — "Sem preço definido" (base_price === 0)
- `smart_no_cost` — "Sem custo definido" (direct_cost null/0)
- `smart_negative_margin` — "Margem negativa" (custo > preço)
- `smart_low_margin` — "Margem baixa (<15%)"
- `smart_no_image` — "Sem imagem"
- `smart_no_sku` — "Sem SKU"
- `smart_no_category` — "Sem categoria"
- `smart_no_description` — "Sem descrição"

Manter os existentes (`smart_recent`, `smart_high_price`, `smart_low_price`, `smart_invalid_sku`).

### 3. Ícones de alerta inline na coluna "Nome"

**Ficheiro**: `src/components/products/ProductsList.tsx` — dentro de `renderProductCell`, case `"name"`

Após o nome do produto, mostrar pequenos ícones de aviso:

- 🔴 dot se `base_price === 0` (sem preço)
- 🟡 dot se margem < 15% e > 0
- 📷 riscado se sem imagem
- Tooltip com a explicação ao hover

Implementar como spans com `title` attribute para tooltip nativo, sem dependência adicional.

### 4. Lógica de filtragem dos novos smart filters

**Ficheiro**: `src/components/products/ProductsList.tsx` — no `switch` de `activeFilterId` (linhas 349-377)

Adicionar cases para cada novo filtro:
```text
smart_no_price → p.base_price === 0
smart_no_cost → !p.direct_cost || p.direct_cost === 0
smart_negative_margin → p.direct_cost && p.direct_cost > p.base_price
smart_low_margin → margin > 0 && margin < 15
smart_no_image → !p.images || p.images.length === 0
smart_no_sku → !p.sku || p.sku.trim() === ''
smart_no_category → !p.category || p.category.trim() === ''
smart_no_description → !p.short_description && !p.commercial_description
```

## Ficheiros Modificados
- `src/components/products/ProductsList.tsx` — summary cards, filtros expandidos, ícones inline

