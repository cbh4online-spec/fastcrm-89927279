

## Plano: Corrigir filtros de segmentos que não funcionam

### Problema
A função `applyConditions` em `useMarketingSegments.ts` (linha 186-204) só processa dois campos: `tags` e `company`. Campos como `source` (Origem), `job_title`, `city` são completamente ignorados — a query corre sem filtro e depois conta 0 porque a lógica nunca é aplicada. Existem 56 leads com source "Lista de Instaladoras de Sistemas de Segurança" na base de dados.

### Solução
Expandir `applyConditions` para suportar **todos os campos e operadores** disponíveis no formulário de segmentos:

**Campos**: `tags`, `company`, `source`, `job_title`, `city`

**Operadores**: `equals` → `.eq()`, `not_equals` → `.neq()`, `contains` → `.ilike(%val%)`, `not_contains` → `.not.ilike()`, `is_empty` → `.is(null)`, `is_not_empty` → `.not.is(null)`

### Ficheiro a editar
- `src/hooks/useMarketingSegments.ts` — reescrever `applyConditions` (linhas 186-204) com switch genérico por operador aplicável a qualquer campo texto

A mesma função `applyConditions` é usada tanto no `countSegmentEntities` como no `useSegmentEntities`, portanto a correção resolve contagem e listagem de uma só vez.

