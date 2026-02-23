

# Upgrade Portal B2B -- Desafio Cliente Pharliss

## Analise do Estado Actual

Apos analise detalhada do codebase, ja existem muitas das pecas fundamentais:

| Funcionalidade | Estado |
|---|---|
| Dashboard Cliente | Existe e esta completo (KPIs, charts, alertas, top produtos) |
| Catalogo com filtros (categoria, funcao, patologia) | Existe via `product_attributes` |
| Ficha de Produto (modal com galeria, tabs, atributos) | Existe (`ProductDetailModal`) |
| Carrinho com IVA | Existe e funcional |
| Checkout com prestacoes | Existe com toggle e aprovacao |
| Envio email na submissao | Existe via `order-note-submit` edge function |
| Historico de encomendas com estados | Existe com 8 estados |
| Sistema de roles | Existe (client_admin, client_financial, etc.) |
| Favoritos e re-encomenda | Existe |
| Aprovacoes | Existe |

O que **falta** ou precisa de **upgrade**:

| Item | Descricao |
|---|---|
| Campo `line` (Linha de produto) | Nao existe na tabela `products` -- precisa de migracao |
| Filtro por Linha no catalogo | Nao implementado |
| Ficha de produto com campos estruturados | `descricao_tecnica`, `composicao`, `modo_uso`, `resultados_esperados` estao no JSONB `specifications` mas nao em campos dedicados |
| Galeria com zoom | Galeria existe mas sem zoom |
| Bloco comercial na ficha (totais live com IVA) | Existe parcialmente -- precisa mostrar tier pricing |
| Estados expandidos ("Confirmado", "Em preparacao", "Faturado") | Ja existem: `approved`, `in_preparation`, `invoiced` |

---

## Plano de Implementacao (4 Fases)

### Fase 1 -- Migracao de Base de Dados

Adicionar campo `line` (TEXT, nullable) a tabela `products` para suportar filtro por Linha de produto.

**Nota sobre campos tecnico-estruturados**: Os campos `descricao_tecnica`, `composicao`, `modo_uso`, `resultados_esperados` ja sao suportados pelo campo JSONB `specifications` existente. Em vez de criar colunas redundantes, vamos usar chaves estruturadas dentro de `specifications` (que o `ProductTechnicalInfo` ja renderiza). O campo `product_functions` e `product_pathologies` ja estao cobertos pela tabela `product_attributes`.

Migracao SQL:
```sql
ALTER TABLE products ADD COLUMN IF NOT EXISTS line TEXT;
```

### Fase 2 -- Upgrade do Catalogo

**Ficheiro: `src/hooks/client-portal/useClientProducts.ts`**
- Adicionar fetch de valores unicos de `line` para filtro
- Adicionar filtro por `line` na query
- Expor `lines` no return

**Ficheiro: `src/pages/client/ClientCatalogPage.tsx`**
- Adicionar Select de filtro por "Linha" ao lado dos filtros existentes
- Mostrar campo `line` nos cards de produto (badge abaixo da categoria)
- Garantir que o preco mostrado usa `effective_price` (tier pricing) -- ja implementado

### Fase 3 -- Upgrade da Ficha de Produto (Modal Premium)

**Ficheiro: `src/components/client-portal/catalog/ProductImageGallery.tsx`**
- Adicionar funcionalidade de zoom (click para expandir imagem em overlay fullscreen)
- Manter navegacao e thumbnails existentes

**Ficheiro: `src/components/client-portal/catalog/ProductTechnicalInfo.tsx`**
- Garantir renderizacao de seccoes: descricao tecnica, composicao, modo de uso, resultados esperados (ja suportado via `specifications`)
- Melhorar layout visual para ser mais premium/clinico

**Ficheiro: `src/components/client-portal/catalog/ProductDetailModal.tsx`**
- Garantir que o bloco comercial mostra:
  - Preco unitario sem IVA (com tier pricing)
  - Preco base riscado se tem desconto
  - IVA calculado automaticamente
  - Total com IVA actualizado em tempo real
- Ja usa `calculateVAT` e `calculateGross` -- precisa integrar `effective_price` do tier

### Fase 4 -- Upgrade do Catalogo Visual

**Ficheiro: `src/pages/client/ClientCatalogPage.tsx`**
- Substituir o modal inline simples pelo `ProductDetailModal` existente (que ja e premium)
- O catalogo actualmente usa um `Dialog` simples com specs raw -- deve usar o `ProductDetailModal` com galeria, tabs e atributos

---

## Detalhes Tecnicos

### Migracao SQL
```sql
-- Adicionar campo line para categorizar produtos por linha
ALTER TABLE products ADD COLUMN IF NOT EXISTS line TEXT;

-- Indice para performance de filtro
CREATE INDEX IF NOT EXISTS idx_products_line ON products(line) WHERE line IS NOT NULL;
```

### Ficheiros a criar/modificar

| Ficheiro | Accao | Descricao |
|---|---|---|
| Migracao SQL | Novo | Adicionar coluna `line` |
| `src/hooks/client-portal/useClientProducts.ts` | Editar | Adicionar filtro e fetch de `line` |
| `src/pages/client/ClientCatalogPage.tsx` | Editar | Usar `ProductDetailModal`, adicionar filtro Linha, mostrar Linha nos cards |
| `src/components/client-portal/catalog/ProductImageGallery.tsx` | Editar | Adicionar zoom fullscreen |
| `src/components/client-portal/catalog/ProductDetailModal.tsx` | Editar | Integrar `effective_price` e tier pricing no bloco comercial |

### O que NAO precisa de ser feito (ja existe)

- Dashboard cliente (completo com KPIs, charts, alertas)
- Carrinho com IVA e totais
- Checkout com opcao de prestacoes e workflow de aprovacao
- Edge function `order-note-submit` com envio de email via Resend
- Historico de encomendas com estados (draft, submitted, awaiting_approval, approved, rejected, in_preparation, invoiced, cancelled)
- Sistema de roles e permissoes
- Favoritos e re-encomenda
- Tabela `product_attributes` para funcoes e patologias
- Galeria de imagens com navegacao e thumbnails
- Ficha tecnica com composicao e ativos

### Compatibilidade

Todas as alteracoes sao retrocompativeis:
- Campo `line` e nullable -- produtos sem linha continuam a funcionar
- Filtro por Linha so aparece se houver valores
- `ProductDetailModal` ja existe e sera reutilizado
- Nenhum hook, RLS policy ou edge function existente sera quebrado
