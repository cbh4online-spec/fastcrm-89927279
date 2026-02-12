
# Fase B — Motor FastMatch Completo no CRM

Completar a integração do FastMatch como funcionalidade operacional do CRM, incluindo criação automática de entidades, pipeline dedicado, gestão de conexões e entrada na sidebar do CRM.

---

## 1. Pipeline "FastMatch" na Base de Dados

Criar via migração SQL:
- Um pipeline "FastMatch" na tabela `pipelines`
- 4 stages: "Interesse Mútuo" (20%), "Em Conversa" (40%), "Proposta" (70%), "Fechado" (100%)
- Associado ao workspace via trigger ou inserção manual

---

## 2. CRM Auto-Create no Desbloqueio

Refatorar `useUnlockConnection` em `src/hooks/useFastMatchConnections.ts` para, após inserir a conexão:

1. Buscar o perfil do outro membro (`fastmatch_profiles` com company_name, industry, etc.)
2. Criar ou encontrar **empresa** na tabela `companies` (match por `name` + `workspace_id`)
3. Criar ou encontrar **contacto** na tabela `contacts` (com `source = 'fastmatch'`, `company_id` linkado)
4. Criar **oportunidade** na tabela `opportunities`:
   - `source = 'fastmatch'`
   - `stage_id` = primeiro stage do pipeline FastMatch
   - `title` = "FastMatch — [Nome Empresa]"
   - `contact_id` e `company_id` preenchidos
5. Atualizar a `fastmatch_connections` com `crm_opportunity_id`, `crm_contact_id`, `crm_company_id`

---

## 3. FastMatch na Sidebar do CRM

Editar `src/components/layout/Sidebar.tsx`:
- Adicionar item "FastMatch" no grupo **CRM** com ícone `Zap`, href `/dashboard/fastmatch`, highlight true
- Posição: após "Oportunidades"

---

## 4. Aba "Minhas Conexões" na Discovery Page

Editar `src/pages/fastmatch/FastMatchDiscoveryPage.tsx`:
- Adicionar tabs: "Descobrir" (atual) e "Conexões" (lista de conexões desbloqueadas)
- Na tab "Conexões":
  - Lista de cards com nome da empresa, data de desbloqueio, score
  - Deep-links: "Ver no CRM" (oportunidade), "Ver Contacto", "Ver Empresa"
  - Botão "Avaliar" para abrir formulário de reputação

---

## 5. Componente de Avaliação de Reputação

Criar `src/components/fastmatch/ReputationReviewDialog.tsx`:
- Rating 1-5 estrelas
- Comentário opcional
- Insere na tabela `fastmatch_reputation_reviews`
- Atualiza `reputation_score` e `reputation_count` no perfil avaliado

Criar hook `src/hooks/useFastMatchReviews.ts`:
- `useSubmitReview()` — inserir review e recalcular média
- `useConnectionReviews()` — verificar se já avaliou

---

## 6. Card de Conexão Desbloqueada

Criar `src/components/fastmatch/ConnectionCard.tsx`:
- Mostra empresa, indústria, data de desbloqueio
- Badges: Verificado, Fundador
- Reputação com estrelas
- CTAs: "Ver no CRM", "Avaliar Conexão"

---

## 7. Anúncios com Dados Reais

Editar `src/pages/fastclub/AnunciosPage.tsx`:
- Remover array `SAMPLE_ANNOUNCEMENTS` hardcoded
- Buscar de `fastclub_content_sections` com `page_key = 'anuncios'`
- Mostrar empty state quando não há anúncios

---

## Detalhe Técnico

### Ficheiros a criar
| Ficheiro | Descrição |
|---|---|
| `src/components/fastmatch/ReputationReviewDialog.tsx` | Diálogo de avaliação 1-5 estrelas |
| `src/components/fastmatch/ConnectionCard.tsx` | Card de conexão desbloqueada |
| `src/hooks/useFastMatchReviews.ts` | Hook para reviews de reputação |

### Ficheiros a editar
| Ficheiro | Alteração |
|---|---|
| `src/hooks/useFastMatchConnections.ts` | Adicionar lógica CRM auto-create no unlock |
| `src/pages/fastmatch/FastMatchDiscoveryPage.tsx` | Adicionar tab "Conexões" com lista e deep-links |
| `src/components/layout/Sidebar.tsx` | Adicionar "FastMatch" ao grupo CRM |
| `src/pages/fastclub/AnunciosPage.tsx` | Substituir dados hardcoded por query à DB |

### Migração SQL
- Criar pipeline "FastMatch" + 4 stages (por workspace existente, ou template para novos workspaces)

### Ordem de execução
1. Migração SQL (pipeline + stages)
2. Hook de reviews + componentes novos
3. Refatorar useUnlockConnection com CRM auto-create
4. Atualizar FastMatchDiscoveryPage com tab Conexões
5. Sidebar — adicionar FastMatch ao CRM
6. AnunciosPage — dados reais
