

## Problema

O Supabase tem um **limite padrão de 1000 linhas** por query. A query em `useSmartLeads.ts` não define `.range()` nem aumenta o limite, pelo que nunca devolve mais de 1000 registos — mesmo havendo 2087+ na base de dados.

O header "1000 registos" vem de `totalLeads = sortedLeads.length`, que conta apenas os registos recebidos (máx 1000).

## Plano

### 1. Implementar paginação server-side em `useSmartLeads.ts`

- Usar query separada com `count: 'exact'` para obter o total real de leads (sem limite de 1000)
- Passar `page` e `pageSize` como parâmetros dos filtros
- Usar `.range(from, to)` na query para paginar no servidor em vez de no cliente
- Retornar `{ data, totalCount }` em vez de apenas o array

### 2. Atualizar `SmartLeadsTable.tsx`

- Remover a paginação client-side (`sortedLeads.slice()`)
- Usar o `totalCount` do servidor para o header e cálculo de páginas
- Passar `currentPage` e `pageSize` como filtros para o hook
- Manter a pesquisa/filtros locais ou movê-los para server-side

### 3. Contagem no header

- O `PageHeader count={totalCount}` passará a mostrar o número real (ex: 2087) em vez do máximo de 1000

### Detalhes técnicos

```text
Antes:  query → max 1000 rows → slice client-side → header=1000
Depois: count query → totalCount real
        query.range(page*size, (page+1)*size-1) → pageSize rows
        header = totalCount real
```

**Ficheiros a alterar:**
- `src/hooks/useSmartLeads.ts` — adicionar `.range()` e query de contagem
- `src/components/leads/SmartLeadsTable.tsx` — usar paginação server-side e totalCount real

