

## Plano: Importação Automática Diária dos 9 Portais

### Diagnóstico

A edge function `hr-talent-search` exige autenticação de utilizador (JWT), o que impede a sua utilização directa por um cron job. É necessário criar uma edge function dedicada para importação automática que use `SUPABASE_SERVICE_ROLE_KEY` e itere por todos os workspaces activos.

### Alterações Planeadas

#### 1. Nova Edge Function `hr-portal-auto-import`

Função invocada por cron (sem JWT de utilizador):
- Usa `SUPABASE_SERVICE_ROLE_KEY` para aceder à base de dados
- Busca todos os workspaces activos
- Para cada workspace, itera os 9 portais do `PORTAL_CATALOG`
- Reutiliza a lógica de scrape/search e deduplicação existente (extraída como funções partilhadas)
- Limita a 5 resultados por portal para controlar créditos Firecrawl
- Regista logs de execução (total importado, erros por portal)

#### 2. Cron Job via `pg_cron` + `pg_net`

Agendar execução diária às 06:00 UTC:
```sql
select cron.schedule(
  'daily-portal-import',
  '0 6 * * *',
  $$ select net.http_post(...) $$
);
```

#### 3. Nenhuma alteração necessária na página pública

A `CareersPage.tsx` já agrega vagas da tabela `hr_talent_results` com status `new`/`reviewed`. Os resultados importados automaticamente aparecem imediatamente no portal público sem qualquer modificação adicional.

### Ficheiros a Criar/Modificar

1. **`supabase/functions/hr-portal-auto-import/index.ts`** — Nova edge function com service_role, loop por workspaces e portais
2. **Migração SQL** — Activar `pg_cron`/`pg_net` e criar o schedule
3. **`supabase/functions/hr-talent-search/index.ts`** — Extrair funções partilhadas (detectPlatform, PORTAL_CATALOG, parseContentWithAI) para reutilização, ou duplicar no novo ficheiro

### Segurança

- A função valida um header secreto (`x-cron-secret`) para impedir invocações não autorizadas
- Usa `SERVICE_ROLE_KEY` apenas server-side, nunca exposto ao cliente
- Sem alteração de RLS — a política pública existente já cobre os novos registos

### Riscos

- Consumo de créditos Firecrawl: 9 portais × N workspaces × 5 resultados/dia — mitigado com limite baixo por portal
- Rate limiting do Firecrawl — adicionar delay entre chamadas (1s entre portais)
- Portais governamentais podem falhar silenciosamente — log de erros por portal sem interromper os restantes

