
# Pagina Publica Identica ao FastClubPage

## Resumo

Reescrever o `PublicCommunityPage.tsx` para ser visualmente identico ao `FastClubPage`, incluindo:
- Hero identico (logo, nome, subtitulo, stats com 4 metricas)
- Layout 3 colunas com sidebar
- Todas as tabs visiveis (Discussao, Eventos, Classificacao, Membros, Acerca de)
- Barra de pesquisa + category pills
- Sidebar com info da comunidade, stats e membros

A diferenca: funcionalidades interativas (criar topico, criar evento, convidar, resgatar pontos, admin) ficam bloqueadas -- aparece o CTA de registo/aprovacao.

## Ficheiros a Alterar

| Ficheiro | O que muda |
|---|---|
| `src/pages/community/PublicCommunityPage.tsx` | Reescrita completa para espelhar FastClubPage |
| `src/hooks/usePublicCommunity.ts` | Adicionar hooks para membros e leaderboard publicos |
| `src/components/community/PublicCommunitySidebar.tsx` | **Novo** - sidebar publica (sem hooks autenticados) |

## Detalhes Tecnicos

### 1. Novos hooks publicos (`usePublicCommunity.ts`)

Adicionar:
- `usePublicCommunityMembers(workspaceId)` - busca membros via `community_members` ou `workspace_members` (dados publicos)
- `usePublicCommunityLinks(workspaceId)` - busca links da comunidade

### 2. PublicCommunitySidebar (novo componente)

Versao publica do `CommunitySidebar` que usa os hooks publicos em vez dos autenticados (`useWorkspaceMembers`). Mesmo layout visual:
- Banner gradient
- Nome + badge Publico
- Stats (Membros, Posts, Admins)
- Avatares de membros recentes
- Botao "Registar" em vez de "Convidar Membros"

### 3. PublicCommunityPage (reescrita)

Copiar a estrutura exacta do `FastClubPage`:

```text
+-----------------------------------------------+
|  HERO (identico ao FastClubPage)               |
|  [<-] [Logo] FastClub                          |
|       Comunidade . Gamificacao . Recompensas   |
|  Stats: X Topicos | Y Respostas | Z Canais    |
+-----------------------------------------------+
|  Card gamificacao: visivel mas com overlay      |
|  "Regista-te para ganhar pontos"               |
+-----------------------------------------------+
|  Tabs: Discussao | Eventos | Classificacao |   |
|        Membros | Acerca de                     |
+-----------------------------------------------+
|  Layout 3 colunas:                             |
|  [Conteudo principal 2/3] [Sidebar 1/3]        |
|                                                |
|  Tab Discussao:                                |
|    [Evento banner]                             |
|    [Pesquisar topicos...] [+ Novo (disabled)]  |
|    [Category pills]                            |
|    [SocialPostCards]                            |
|                                                |
|  Tab Eventos: cards (sem criar)                |
|  Tab Classificacao: placeholder/preview        |
|  Tab Membros: lista basica                     |
|  Tab Acerca de: CommunityAbout publico         |
+-----------------------------------------------+
|  CTA fixo: "Regista-te para participar"        |
+-----------------------------------------------+
```

### Comportamento do gate de acesso

- Conteudo e **totalmente visivel** (topicos, eventos, membros, etc.)
- Interacoes bloqueadas: criar topico, responder, votar, resgatar pontos
- Ao clicar num topico sem estar autenticado: redireciona para `/club/:slug/auth`
- Botao "+ Novo" aparece mas redireciona para auth
- Card de gamificacao mostra preview generico com CTA de registo
- Sidebar mostra "Registar" em vez de "Convidar"
- Apos registo, o utilizador precisa de aprovacao (fluxo existente mantido)

### Sem alteracoes na base de dados

Os dados publicos ja estao acessiveis via RLS existente. Apenas precisamos de novos hooks que fazem queries directas sem contexto de workspace autenticado.
