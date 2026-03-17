

## Plano: Histórico de pesquisas + Desduplicação de resultados (Web Search & Google Local)

### Problemas
1. **Sem histórico** — pesquisas anteriores perdem-se ao navegar para outra página
2. **Resultados repetidos** — pesquisar novamente devolve os mesmos resultados já importados
3. **Google Local perde dados** — `importLeads` só guarda `name`, `phone`, `source`; ignora `website`, `address`, `category`, `rating`, `hours`

### Solução

**1. Tabela de histórico de pesquisas** (nova migração)
- Tabela `prospecting_searches`: `id`, `workspace_id`, `user_id`, `search_type` (web_search | google_local), `query`, `location`, `category`, `results_count`, `imported_count`, `result_urls` (text[]), `created_at`
- RLS: utilizadores autenticados veem apenas do seu workspace

**2. Desduplicação nos resultados** (ambas as páginas)
- Após receber resultados, comparar com leads existentes no workspace por `name` + `phone` ou `website`
- Marcar visualmente com badge "Já existe" os que já foram importados
- Permitir reimportar manualmente se desejado
- Também comparar com `result_urls` do histórico de pesquisas para marcar "Já encontrado antes"

**3. Histórico visível na UI** (ambas as páginas)
- Secção colapsável "Pesquisas anteriores" com últimas 20 pesquisas
- Clicar numa pesquisa anterior repete-a (pre-fill dos termos)
- Badge com contagem de leads importados por pesquisa

**4. Google Local — enriquecer importação** (`importLeads`)
- Mapear todos os campos disponíveis: `website`, `address`, `city` (extraído da morada), `about` (businessType + description), `industry` (category), `lead_type: "company"`
- Formatar `notes` com rating, reviews, horário

**5. Paginação/offset no Google Local** (edge function + frontend)
- Suporte a `start` offset na SerpAPI
- Botão "Carregar mais" que incrementa offset para obter resultados novos
- Na Web Search (Firecrawl), não há offset nativo — a desduplicação via histórico resolve o problema

### Ficheiros a criar/editar
- **Migração SQL**: tabela `prospecting_searches` + RLS
- `src/hooks/useProspectingHistory.ts` — hook para CRUD do histórico
- `src/pages/GoogleLocalProspecting.tsx` — enriquecer importação + desduplicação + histórico + offset
- `src/pages/WebSearchProspecting.tsx` — desduplicação + histórico
- `supabase/functions/google-local-search/index.ts` — suporte a parâmetro `start`

