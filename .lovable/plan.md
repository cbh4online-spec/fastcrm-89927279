

## Otimizar Performance das Listas de Leads, Contactos e Empresas

### Problema Identificado

As listas demoram a abrir porque:

1. **Batch fetching de TODOS os registos** -- `useSmartLeads` faz um loop `while(true)` que carrega 1000 em 1000 registos até ter TODOS na memória antes de renderizar. Com centenas/milhares de leads, isto gera N requests sequenciais antes de mostrar a tabela.
2. **`select("*")` com JOINs pesados** -- cada lead traz consigo todas as conversations e opportunities associadas (JOINs desnecessários para a listagem).
3. **KPIs carregam tudo de novo** -- `useLeadsKPIs` repete o mesmo fetch de todos os registos com JOINs, duplicando o trabalho.
4. **Sem staleTime** -- React Query refaz o fetch sempre que o componente monta, sem cache útil.

### Solução: Paginacao Server-Side + Queries Leves

| Alteracao | Ficheiro | Detalhe |
|---|---|---|
| Paginacao server-side | `useSmartLeads.ts` | Eliminar o loop `while(true)`. Usar `.range(offset, offset + pageSize - 1)` com `count: 'exact'`. Retornar `{ data, totalCount }` |
| Paginacao server-side | `useSmartContacts.ts` | Mesmo padrao -- query paginada com count |
| Paginacao server-side | `useSmartCompanies.ts` | Mesmo padrao -- query paginada com count |
| Smart filters via SQL | `useSmartLeads.ts` | Mover filtros "hot", "today", "this_week" para WHERE clauses SQL em vez de filtrar client-side |
| KPIs leves | `useSmartLeads.ts` | `useLeadsKPIs`: usar `select("id", { count: "exact", head: true })` com filtros SQL para cada metrica, em vez de carregar todos os registos |
| KPIs leves | `useSmartContacts.ts` | Mesmo padrao para `useContactsKPIs` |
| KPIs leves | `useSmartCompanies.ts` | Mesmo padrao para `useCompaniesKPIs` |
| Colunas selectivas | `useSmartLeads.ts` | Substituir `select("*")` por lista explicita de ~15 colunas necessarias na tabela |
| Cache | Todos os 3 hooks | Adicionar `staleTime: 30_000` e `placeholderData: keepPreviousData` para evitar flashes e refetches |
| Tabela paginada | `SmartLeadsTable.tsx`, `SmartContactsTable.tsx`, `SmartCompaniesTable.tsx` | Adaptar os componentes para usar `page` e `pageSize` como parametros da query, e mostrar total count vindo do servidor |

### Impacto Esperado

- **Antes**: N requests de 1000 rows (ex: 3000 leads = 3 requests sequenciais + processamento JS de tudo)
- **Depois**: 1 request de 25-100 rows com count header -- resposta em < 200ms

### Detalhes Tecnicos

```text
-- Antes (useSmartLeads):
while(true) {
  query.range(from, from + 999)  // Loop ate acabar
}

-- Depois:
query
  .select("id, name, email, phone, source, status, ai_temperature, lead_score, ...")
  .range(page * pageSize, (page + 1) * pageSize - 1)
  // count: 'exact' retorna total no header

-- KPIs (antes: fetch all + count in JS)
-- KPIs (depois):
select("id", { count: "exact", head: true }).eq("ai_temperature", "hot")  // 0 rows transferred
```

Nenhuma migracao de base de dados e necessaria.

