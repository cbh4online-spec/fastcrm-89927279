

## Problema

Ao mudar o "Mostrar X por página" na lista de Produtos, o selector não funciona correctamente e o scroll bloqueia. Duas causas identificadas:

1. **SelectContent sem z-index** — O dropdown do page size (linha 1185) não tem `className="bg-popover z-50"`, ao contrário de componentes idênticos noutras tabelas. O popover fica escondido por trás de elementos com overflow ou z-index superior, impedindo a selecção.

2. **Limite de 1000 registos do Supabase** — O hook `useProducts` (em `src/hooks/useProducts.ts`) não define `.limit()` nem paginação server-side. O Supabase devolve no máximo 1000 linhas por defeito. O screenshot confirma "1000 registos" exactos, o que sugere que existem mais produtos que não são carregados.

## Plano

### 1. Corrigir o SelectContent do page size
**Ficheiro:** `src/components/products/ProductsList.tsx` (linha 1185)

Adicionar `className="bg-popover z-50"` ao `<SelectContent>` da paginação, tal como já existe nas tabelas de contactos e empresas. Isto garante que o dropdown aparece acima de todos os outros elementos.

### 2. Aumentar o limite da query de produtos
**Ficheiro:** `src/hooks/useProducts.ts` (linha ~52-74)

Adicionar `.limit(5000)` (ou outro valor adequado) à query Supabase, para ultrapassar o limite default de 1000 e carregar todos os produtos do workspace. Alternativa: implementar paginação server-side, mas dado o padrão actual (client-side slice), o `.limit()` elevado é a solução mais simples e consistente.

### Ficheiros a alterar
- `src/components/products/ProductsList.tsx` — z-index no SelectContent
- `src/hooks/useProducts.ts` — `.limit()` na query

