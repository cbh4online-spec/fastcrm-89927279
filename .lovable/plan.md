
# FastMatch Engine + FastClub Reestruturado

## Visao Geral

Implementacao do motor de matching universal (FastMatch) integrado no FastCRM e reestruturacao da navegacao do FastClub. Este e um projeto de grande escala que sera dividido em **3 fases incrementais**.

---

## Fase A: Base de Dados + Motor de Quotas

### Novas tabelas

**`fastmatch_profiles`** -- Perfil de matching de cada membro
- id, workspace_id, user_id, member_id (FK community_members)
- company_name, industry, target_audience, ticket_range, services_offered, services_needed
- bio, website_url, linkedin_url
- reputation_score (decimal, default 5.0), reputation_count (integer)
- is_verified (boolean), is_founder (boolean)
- founder_quota_override (integer, nullable), founder_expiry_date (timestamp, nullable)
- match_quota_monthly (integer, default 1)
- match_used_current_period (integer, default 0)
- extra_credits_balance (integer, default 0)
- period_reset_date (timestamp)
- strategic_score (integer, nullable) -- calculado por ciclos
- strategic_reasons (jsonb, nullable) -- razoes gerais do score
- last_score_update (timestamp, nullable)
- status (text: active, suspended, inactive)
- created_at, updated_at

**`fastmatch_interests`** -- Demonstracoes de interesse
- id, workspace_id
- from_profile_id (FK fastmatch_profiles)
- to_profile_id (FK fastmatch_profiles)
- status (text: pending, mutual, expired, withdrawn)
- created_at

**`fastmatch_connections`** -- Conexoes desbloqueadas (match mutuo)
- id, workspace_id
- profile_a_id, profile_b_id (FK fastmatch_profiles)
- unlocked_at (timestamp)
- unlocked_by (uuid) -- quem consumiu o credito
- credits_consumed (integer, default 1)
- source (text: quota, extra_credits)
- crm_opportunity_id (uuid, nullable, FK opportunities)
- crm_contact_id (uuid, nullable, FK contacts)
- crm_company_id (uuid, nullable, FK companies)
- status (text: active, archived)
- created_at

**`fastmatch_reputation_reviews`** -- Avaliacoes de reputacao
- id, workspace_id
- connection_id (FK fastmatch_connections)
- reviewer_profile_id, reviewed_profile_id (FK fastmatch_profiles)
- rating (integer, 1-5)
- comment (text, nullable)
- created_at

### Funcao de reset mensal de quotas

Funcao SQL `reset_fastmatch_quotas()` que:
- Reseta `match_used_current_period` para 0
- Atualiza `period_reset_date` para o proximo mes
- Verifica `founder_expiry_date` e reverte quotas de fundadores expirados

Cron job mensal para executar automaticamente.

### Funcao de consumo de quota

Funcao SQL `consume_fastmatch_quota(p_profile_id, p_workspace_id)` que:
1. Verifica se `match_used_current_period < match_quota_monthly` (considerando founder_quota_override se aplicavel)
2. Se sim, incrementa `match_used_current_period` e retorna sucesso
3. Se nao, verifica `extra_credits_balance > 0`
4. Se sim, decrementa `extra_credits_balance` e retorna sucesso com source=extra_credits
5. Se nao, retorna erro com mensagem de quota esgotada

### RLS Policies

- Perfis visiveis para todos os membros verificados do workspace (SELECT)
- Interesses: INSERT/SELECT apenas pelo proprio user
- Conexoes: SELECT onde o user e um dos dois perfis
- Reviews: INSERT apenas por participantes da conexao

---

## Fase B: UI do FastMatch (Motor no CRM)

### Novas paginas e componentes

**`src/pages/fastclub/FastMatchDiscoveryPage.tsx`** -- Descoberta de perfis
- Grid de cards executivos (nao social) com:
  - Nome da empresa, industria, publico-alvo
  - Badge "Cliente FastCRM Verificado" (se is_crm_verified)
  - Badge "Membro Fundador" (se is_founder e nao expirado)
  - Score Estrategico: XX% com razoes gerais
  - Reputacao: X.X (estrelas discretas)
  - Botao "Demonstrar Interesse"
- Filtros: industria, servicos, ticket range
- Barra de quota no topo: "X/Y matches usados este mes"
- Banner de upgrade quando quota esgotada (nao bloqueante para descoberta)

**`src/components/fastmatch/MatchProfileCard.tsx`** -- Card executivo
- Estilo corporativo, minimalista
- Sem emojis, sem linguagem ludica
- Badges discretos para verificacao e fundador

**`src/components/fastmatch/QuotaIndicator.tsx`** -- Indicador de quota
- Barra de progresso com X/Y usado
- Muda de cor conforme uso (verde -> amarelo -> vermelho)

**`src/components/fastmatch/UpgradeBanner.tsx`** -- Banner de upgrade
- Discreto, nao intrusivo
- CTAs: "Atualizar Plano" e "Comprar Creditos Extra"
- Integra com `QuotaLimitDialog` existente e `PurchaseCreditsModal`

**`src/components/fastmatch/InterestConfirmDialog.tsx`** -- Confirmacao de interesse
- "Demonstrar Interesse em [Empresa]?"
- Se interesse mutuo detectado: verificar quota e desbloquear

**`src/components/fastmatch/ConnectionUnlockedDialog.tsx`** -- Conexao desbloqueada
- Mostra dados de contacto
- CTAs: "Ver no CRM", "Enviar Mensagem"
- Deep-links para oportunidade criada

### Integracao CRM (no desbloqueio)

Quando uma conexao e desbloqueada:
1. Criar contacto no FastCRM (se nao existir) com tag `origin=fastmatch`
2. Criar empresa (se nao existir)
3. Criar oportunidade no pipeline "FastMatch" com source=fastmatch
4. Guardar IDs na `fastmatch_connections`

### Hooks

- `useFastMatchProfile()` -- perfil do user logado
- `useFastMatchDiscovery()` -- lista de perfis com filtros
- `useFastMatchInterests()` -- interesses enviados e recebidos
- `useFastMatchConnections()` -- conexoes ativas
- `useFastMatchQuota()` -- quota atual e logica de consumo

---

## Fase C: Reestruturacao do FastClub + Navegacao

### Sidebar reestruturada

Substituir a lista atual de items do FastClub por esta estrutura:

```text
FastClub (grupo)
  FastClub Hub (landing interna)
  Start Here
  Metodo PARE
  FastCRM em Acao (rename de "Demos")
  Rede Privada (novo - hub educativo, NAO faz matching)
  Resultados
  Anuncios Oficiais (novo - pagina simples)
  Conta & Plano (link para Settings > Billing)
  ---- Zona Premium ----
  Missao da Semana
  Implementacao Guiada
  IA Avancada
  Laboratorio Fast
  Hot Seats
```

Items removidos da sidebar FastClub:
- "Desafio 7 Dias" (mover para dentro de Start Here como CTA)
- "Forum" (integrado dentro das paginas relevantes)
- "Recompensas" (mover para Conta & Plano)
- "FastMatch Hub" (renomear para "Rede Privada" -- hub educativo)

### Novas paginas

**`src/pages/fastclub/RedePrivadaPage.tsx`** -- Hub educativo da rede
- NAO faz matching
- Conteudo educativo: estrategias, casos reais, cultura da rede
- Indicadores agregados (membros ativos, conexoes feitas)
- CTA fixo: "Abrir FastMatch no CRM" (deep-link para FastMatchDiscoveryPage)
- Dados de `fastclub_content_sections` com page_key = 'rede-privada'

**`src/pages/fastclub/AnunciosPage.tsx`** -- Anuncios oficiais
- Lista cronologica de anuncios
- Dados de `fastclub_content_sections` com page_key = 'anuncios'
- Badges: Novo, Importante, Atualizacao

### Rename

- "FastCRM em Acao" substitui "Demos" (reutilizar DemosPage.tsx, atualizar label na sidebar)
- "Rede Privada" substitui "FastMatch Hub" na sidebar do FastClub (o motor de matching real fica como pagina separada no CRM)

### Rota do FastMatch no CRM

Adicionar rota `/dashboard/fastmatch` (fora do grupo FastClub) para a pagina de descoberta de matching real. Esta rota e acessivel via deep-links e via sidebar do CRM (nao do FastClub).

---

## Planos de quota padrao

| Tier | Quota mensal | Fundador (3 meses) |
|---|---|---|
| Free | 1 match/mes | 5 matches/mes |
| Pro (Premium) | 5 matches/mes | 20 matches/mes |
| Elite (Agency) | 15 matches/mes | 50 matches/mes |

Os valores sao definidos ao criar/atualizar o `fastmatch_profiles` com base no tier do `community_members.membership_tier` e no plano SaaS do workspace.

---

## Ficheiros a criar

| Ficheiro | Descricao |
|---|---|
| `src/pages/fastclub/RedePrivadaPage.tsx` | Hub educativo da rede |
| `src/pages/fastclub/AnunciosPage.tsx` | Anuncios oficiais |
| `src/pages/fastmatch/FastMatchDiscoveryPage.tsx` | Motor de descoberta e matching |
| `src/components/fastmatch/MatchProfileCard.tsx` | Card executivo de perfil |
| `src/components/fastmatch/QuotaIndicator.tsx` | Barra de quota mensal |
| `src/components/fastmatch/UpgradeBanner.tsx` | Banner discreto de upgrade |
| `src/components/fastmatch/InterestConfirmDialog.tsx` | Dialogo de confirmacao |
| `src/components/fastmatch/ConnectionUnlockedDialog.tsx` | Dialogo pos-desbloqueio |
| `src/components/fastmatch/FounderBadge.tsx` | Badge Membro Fundador |
| `src/components/fastmatch/VerifiedBadge.tsx` | Badge Cliente Verificado |
| `src/hooks/useFastMatchProfile.ts` | Hook do perfil de matching |
| `src/hooks/useFastMatchDiscovery.ts` | Hook de descoberta |
| `src/hooks/useFastMatchInterests.ts` | Hook de interesses |
| `src/hooks/useFastMatchConnections.ts` | Hook de conexoes |
| `src/hooks/useFastMatchQuota.ts` | Hook de quota |

## Ficheiros a editar

| Ficheiro | Acao |
|---|---|
| `src/components/layout/Sidebar.tsx` | Reestruturar items FastClub + adicionar rota FastMatch no CRM |
| `src/App.tsx` | Adicionar rotas novas |
| `src/pages/fastclub/FastMatchPage.tsx` | Converter para hub educativo (RedePrivadaPage) ou remover |
| `src/types/saas.ts` | Adicionar RESOURCE_TYPES para matches |

## Migracoes de base de dados

1. Criar tabelas: fastmatch_profiles, fastmatch_interests, fastmatch_connections, fastmatch_reputation_reviews
2. Criar funcoes: consume_fastmatch_quota, reset_fastmatch_quotas
3. Criar pipeline "FastMatch" na tabela pipelines (com stages padrao)
4. RLS policies para todas as novas tabelas
5. Cron job para reset mensal

---

## Estrategia de implementacao

Dada a dimensao, recomendo comecar pela **Fase A** (base de dados) e depois avancar para a **Fase C** (navegacao) e por fim a **Fase B** (motor de matching). Isto permite ter a estrutura de navegacao correta rapidamente enquanto o motor complexo e construido incrementalmente.

Queres avancar com a Fase A primeiro?
