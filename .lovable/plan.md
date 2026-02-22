

# Desenvolver funcionalidades restantes do Lead Enricher Pro

## Resumo

Implementar 4 funcionalidades que faltam no Lead Enricher Pro:
1. Persistir configuracoes na base de dados (por workspace)
2. Fazer as configuracoes afetarem o processo de enriquecimento
3. Enriquecimento Automatico de novos leads
4. Validacao de Email

---

## 1. Tabela de configuracoes (base de dados)

Criar tabela `lead_enricher_settings` para guardar preferencias por workspace:

```text
lead_enricher_settings
- id (uuid, PK)
- workspace_id (uuid, FK, unique)
- google_enabled (boolean, default true)
- linkedin_enabled (boolean, default true)
- webscraping_enabled (boolean, default true)
- auto_enrich_enabled (boolean, default false)
- email_validation_enabled (boolean, default false)
- created_at, updated_at
```

RLS: apenas membros do workspace podem ler/escrever.

## 2. Hook useLeadEnricherSettings

Novo hook `src/hooks/useLeadEnricherSettings.ts`:
- Busca configuracoes do workspace actual (ou devolve defaults)
- Mutacao para upsert das configuracoes
- Usado na tab "Configuracoes" para substituir o estado local actual

## 3. Configuracoes funcionais na edge function

Modificar a chamada de enriquecimento para passar as configuracoes activas. A edge function `contact-enrich` recebe flags (`google`, `linkedin`, `webscraping`) e so executa os passos correspondentes:
- `google_enabled = false`: salta o scraping via Firecrawl
- `linkedin_enabled = false`: salta pesquisa LinkedIn (futuro)
- `webscraping_enabled = false`: salta scraping do website

## 4. Enriquecimento Automatico

Implementar via trigger de base de dados + funcao que invoca a edge function:
- Adicionar um trigger na tabela `leads` que, ao inserir um novo lead, marca-o para enriquecimento numa fila (coluna `enrichment_queued_at`)
- No frontend, criar um polling simples no hook `useLeadEnrichment` que detecta leads recem-inseridos com `enrichment_queued_at IS NOT NULL` e dispara o enriquecimento
- Alternativa mais simples: usar um database webhook (pg_net) que chama a edge function directamente ao inserir um lead -- mas requer extensao pg_net

Abordagem escolhida (mais pragmatica): Quando `auto_enrich_enabled = true`, o frontend auto-enriquece novos leads ao detecta-los via polling/realtime na lista de leads.

## 5. Validacao de Email

Criar edge function `validate-email` que:
- Verifica formato do email (regex)
- Verifica se o dominio tem registos MX (DNS lookup via Deno)
- Devolve resultado: `valid`, `invalid`, `unknown`

Integrar no fluxo de enriquecimento: quando `email_validation_enabled = true`, apos enriquecer valida os emails encontrados.

No UI, mostrar badge de validacao junto ao email do lead.

---

## Detalhes tecnicos

### Ficheiros a criar:
- `src/hooks/useLeadEnricherSettings.ts` -- hook CRUD para configuracoes
- `supabase/functions/validate-email/index.ts` -- edge function de validacao

### Ficheiros a modificar:
- `src/pages/LeadEnricher.tsx` -- substituir estado local por hook de configuracoes, adicionar logica de auto-enrich, badges de validacao de email
- `src/hooks/useLeadEnrichment.ts` -- passar configuracoes para a edge function, integrar validacao
- `supabase/functions/contact-enrich/index.ts` -- respeitar flags de configuracao recebidas

### Migracao SQL:
- Criar tabela `lead_enricher_settings`
- Adicionar colunas `email_verified` (boolean) e `enrichment_queued_at` (timestamptz) na tabela `leads`
- RLS policies para a nova tabela

### Alteracoes na UI (tab Configuracoes):
- Remover badges "Em breve" do Enriquecimento Automatico e Validacao de Email
- Substituir por Switches funcionais ligados ao hook de configuracoes
- Adicionar indicador de "a guardar..." ao mudar configuracoes

