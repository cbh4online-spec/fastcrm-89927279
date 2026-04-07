

## Diagnóstico

Analisando o screenshot (IMG_0417), identifico 3 problemas críticos:

1. **"SD" ainda aparece ao lado do logo** — No `StoreHeader.tsx` linha 76, a condição `(!logoUrl || true)` faz com que o `storeName` seja **sempre** renderizado, anulando o `hidden sm:inline` aplicado depois. O `|| true` é um bug.

2. **Categoria ocupa 5-6 linhas nos cards** — "ACESSÓRIOS DE SEGURANÇA CONTRA INCÊNDIO" em `uppercase tracking-wider` expande demasiado horizontalmente em cards de ~170px. O `line-clamp-1` não é suficiente quando o texto é tão longo. Solução: **esconder a categoria em mobile** (`hidden sm:block`) — é redundante quando o utilizador já filtrou por categoria.

3. **Nome do produto truncado a "Acessór de..."** — Com a categoria a ocupar tanto espaço, o `line-clamp-2` mal mostra 1 palavra. Escondendo a categoria em mobile, o nome ganha espaço para 2 linhas legíveis.

4. **Barra de filtros mobile** — O botão "Filtros" + contagem de produtos está separado do grid, criando um layout disperso. Deve ficar numa barra horizontal compacta acima do grid com o sort integrado.

## Plano de Implementação

### 1. Corrigir bug do storeName no header
**Ficheiro:** `src/components/store/StoreHeader.tsx`
- Linha 76: Mudar `(!logoUrl || true)` para `!logoUrl` — quando há logo, esconder o nome em mobile

### 2. Esconder categoria em mobile nos cards
**Ficheiro:** `src/components/store/StoreProductCard.tsx`
- Linha 320-323: Adicionar `hidden sm:block` à categoria — em mobile a categoria é redundante (especialmente quando se filtra por categoria)

### 3. Melhorar barra de filtros mobile
**Ficheiro:** `src/components/store/storefront/StoreCatalogSection.tsx`
- Integrar o botão de filtros (Sheet trigger) e a contagem de produtos numa barra horizontal compacta acima do grid
- Adicionar o select de ordenação na mesma barra em mobile

**Ficheiro:** `src/components/store/StoreFilterSidebar.tsx`
- Extrair o Sheet trigger para fora do componente, ou expor o mobile trigger separadamente para ser posicionado na barra superior do catálogo

### Ficheiros a modificar
- `src/components/store/StoreHeader.tsx` — corrigir condição `|| true`
- `src/components/store/StoreProductCard.tsx` — esconder categoria em mobile
- `src/components/store/storefront/StoreCatalogSection.tsx` — barra de filtros horizontal
- `src/components/store/StoreFilterSidebar.tsx` — ajustar trigger mobile

### Critérios de Aceitação
- Sem "SD" ao lado do logo em mobile quando há logo
- Categoria invisível em mobile, visível em `sm:` e acima
- Nome do produto com 2 linhas legíveis em cards mobile
- Barra de filtros compacta e horizontal acima do grid em mobile
- Layout limpo em 375-414px

