
# Melhorias ao FastClub inspiradas no GoKollab/PARE CONNECT

## Contexto

As imagens de referencia mostram uma plataforma de comunidade completa (GoKollab) com funcionalidades avancadas de gestao de grupo, feeds sociais ricos e painel de administracao. O FastClub atual ja tem o hub principal, forum, gamificacao e recompensas. Faltam varias funcionalidades que tornam a experiencia mais profissional e configuravel.

## Funcionalidades a Implementar

### 1. Feed Social Enriquecido (Homepage do FastClub)
Melhorar o feed atual para se parecer mais com uma rede social:
- Posts com avatar do autor, nome e canal/categoria como badge
- Suporte a hashtags no conteudo (highlight visual)
- Preview de imagens inline nos posts
- Botoes de like e comentario directamente no card do feed
- Badge "@everyone" para mencoes globais

### 2. Sidebar Direita -- Info da Comunidade
Adicionar painel lateral inspirado no GoKollab:
- Banner/imagem da comunidade
- Nome, tipo (Publico/Privado) e descricao
- Links promocionais configuraveis (Youtube, Website, CRM, etc.)
- Estatisticas: Membros, Posts, Administradores
- Avatares dos membros mais recentes
- Botao "Convidar Membros"

### 3. Tabs de Navegacao no Topo
Substituir os botoes do hero por tabs horizontais:
- Discussao (feed principal)
- Eventos (lista de eventos/lives agendados)
- Classificacao (leaderboard de pontos)
- Membros (lista de membros)
- Acerca de (descricao da comunidade)

### 4. Dialog de Definicoes da Comunidade (Admin)
Dialog completo de configuracao com menu lateral e tabs:
- **Detalhes**: Nome, slug/URL, descricao, publico/privado
- **Assinatura**: Acesso gratuito ou pago (integracao com planos existentes)
- **Newsletter**: Frequencia do resumo (diario/semanal/desligado)
- **Marca**: Logo e cores personalizadas da comunidade
- **Ligacoes Promocionais**: CRUD de links com titulo e URL (aparecem no sidebar)
- **Perguntas de Adesao**: Questionario para novos membros com toggle on/off, tipos texto/selecao unica
- **Gamificacao**: Configurar regras de pontos

### 5. Banner de Eventos/Lives
Barra de alerta no topo do feed quando existe um evento proximo:
- "Cafe Digital esta a acontecer em 12 horas"
- Icone de live e link para o evento

## Detalhes Tecnicos

### Novas Tabelas (Migracoes SQL)

**`community_settings`** -- Configuracoes gerais da comunidade por workspace:
- `id`, `workspace_id` (FK), `name`, `description`, `slug`, `is_private` (boolean), `logo_url`, `banner_url`, `primary_color`, `newsletter_frequency` (enum: none/daily/weekly), `membership_questions_enabled` (boolean), `created_at`, `updated_at`

**`community_links`** -- Links promocionais do sidebar:
- `id`, `workspace_id` (FK), `title`, `url`, `sort_order`, `created_at`

**`community_membership_questions`** -- Perguntas de adesao:
- `id`, `workspace_id` (FK), `question_text`, `question_type` (text/single_choice), `options` (jsonb, para selecao unica), `sort_order`, `is_active`, `created_at`

**`community_events`** -- Eventos e lives agendados:
- `id`, `workspace_id` (FK), `title`, `description`, `event_type` (live/event), `starts_at`, `ends_at`, `link`, `created_by`, `created_at`

### Ficheiros a Criar/Modificar

| Ficheiro | Acao | Descricao |
|---|---|---|
| `src/pages/community/FastClubPage.tsx` | Modificar | Redesign com tabs, feed social enriquecido e sidebar direito |
| `src/components/community/CommunitySettingsDialog.tsx` | Criar | Dialog de definicoes com todas as tabs |
| `src/components/community/CommunitySidebar.tsx` | Criar | Sidebar direito com info, links e stats |
| `src/components/community/CommunityEventBanner.tsx` | Criar | Banner de eventos/lives proximos |
| `src/components/community/CommunityMembersList.tsx` | Criar | Tab de membros da comunidade |
| `src/components/community/CommunityLeaderboard.tsx` | Criar | Tab de classificacao/leaderboard |
| `src/components/community/CommunityAbout.tsx` | Criar | Tab "Acerca de" |
| `src/components/community/SocialPostCard.tsx` | Criar | Card de post estilo rede social com avatar, likes, imagens |
| `src/hooks/useCommunitySettings.ts` | Criar | CRUD para settings, links e questions |
| `src/hooks/useCommunityEvents.ts` | Criar | Queries para eventos |
| Migration SQL | Criar | Tabelas community_settings, community_links, community_membership_questions, community_events |

### Politicas RLS
- `community_settings`: leitura publica por workspace, escrita apenas para admins
- `community_links`: leitura publica, escrita admin
- `community_membership_questions`: leitura publica, escrita admin
- `community_events`: leitura publica, escrita admin

### Fluxo de Dados

O FastClubPage passa a ser o hub central com 5 tabs. O conteudo do feed usa os dados existentes de `forum_topics` e `forum_posts` mas renderiza-os com o novo `SocialPostCard`. O sidebar direito carrega dados de `community_settings` e `community_links`. O dialog de definicoes e acessivel apenas para admins via icone de engrenagem no header.
