

## Diagnóstico: Pesquisa de Ofertas de Emprego Não Funciona

### Problema Identificado

A edge function `hr-talent-search` está a fazer timeout (>60s) porque o Firecrawl search é chamado com `scrapeOptions: { formats: ["markdown"] }`, o que faz scraping completo de cada página de resultado. Com 10-15 resultados, cada um a ser scraped, a operação excede o limite de tempo da edge function.

**Evidência dos logs:**
- A função arranca e inicia a pesquisa
- Nunca chega ao passo de inserção na DB
- Erros de AI extraction com 503 (upstream timeout)
- `context canceled` no lado do cliente

### Plano de Correção

#### 1. Remover scrapeOptions da pesquisa Firecrawl (web search e portal import)

O Firecrawl `/v1/search` já retorna `title`, `description` e `url` sem necessidade de scraping. Remover `scrapeOptions: { formats: ["markdown"] }` para que a pesquisa retorne apenas metadados, reduzindo o tempo de resposta de ~60s+ para ~3-5s.

**Ficheiro:** `supabase/functions/hr-talent-search/index.ts`
- Linha 182: remover `scrapeOptions: { formats: ["markdown"] }` da web search
- Linha 307: remover `scrapeOptions: { formats: ["markdown"] }` do portal import
- Ajustar `extractSearchResults` para funcionar sem markdown (usar `description` do search result)

#### 2. Tornar AI extraction condicional e mais rápida

Quando não há markdown, a extração AI usa apenas o `title` + `description` do resultado de pesquisa. Isto é suficiente para preencher os campos básicos sem chamar a AI gateway (que também está a dar 503).

- Se `description` é curta (<50 chars), salvar resultado sem enriquecimento AI
- Reduzir limite de resultados de 10 para 5 na web search para maior fiabilidade

#### 3. Aplicar o mesmo fix ao auto-import

**Ficheiro:** `supabase/functions/hr-portal-auto-import/index.ts`
- Linha 211: remover `scrapeOptions` do auto-import
- Já tem limite de 5 resultados, o que é adequado

#### 4. Adicionar timeout handling resiliente

Adicionar `AbortController` com timeout de 25s nas chamadas Firecrawl para evitar que a edge function fique pendurada até ao limite dos 60s.

### Ficheiros a Modificar

1. `supabase/functions/hr-talent-search/index.ts` - Fix principal
2. `supabase/functions/hr-portal-auto-import/index.ts` - Fix consistente

### Resultado Esperado

- Pesquisa web retorna resultados em 3-5s em vez de timeout
- Portal import funciona de forma fiável
- Resultados têm título, descrição, URL e plataforma (sem markdown completo)
- AI enrichment aplica-se apenas quando há conteúdo suficiente

