
# Migrar FastClub de /dashboard/fastclub para /club/fastclub

## Problema Atual

Todo o conteudo do FastClub (Start Here, Metodo PARE, Demos, Rede Privada, Zona Premium, etc.) vive em rotas `/dashboard/fastclub/...` dentro do CRM. O portal publico `/club/fastclub` e apenas uma landing page basica que redireciona membros aprovados para o dashboard.

O utilizador quer que **todo o conteudo do FastClub viva dentro de `/club/fastclub/...`**, como portal autonomo da comunidade.

---

## Arquitetura Proposta

### Novo Layout: `ClubLayout`

Criar um layout dedicado para o portal `/club/fastclub` que substitui o `DashboardLayout` do CRM. Este layout tera:

- **Sidebar propria** com a navegacao completa do FastClub (zonas publica, premium, rede privada, institucional)
- **TopBar simplificada** com logo da comunidade, nome e botao de perfil
- **Gate de acesso**: verificar se o utilizador esta autenticado e e membro (active/workspace_member). Caso contrario, redirecionar para `/club/fastclub/auth`.

```text
+------------------+-----------------------------+
|  Club Sidebar    |  Conteudo da pagina         |
|                  |                             |
|  Start Here      |  (SubchannelLayout ou       |
|  Metodo PARE     |   pagina de hub)            |
|    Planeamento   |                             |
|    Automacao     |                             |
|    ...           |                             |
|  Rede Privada    |                             |
|    ...           |                             |
|  --- Premium --- |                             |
|  Missao Semana   |                             |
|    ...           |                             |
|  --- Instit. --- |                             |
|  Anuncios        |                             |
+------------------+-----------------------------+
```

---

## Plano de Execucao

### 1. Criar `ClubLayout` e `ClubSidebar`

**Criar**: `src/components/club/ClubLayout.tsx`
- Verifica autenticacao e membership status
- Se nao autenticado ou nao membro: redireciona para `/club/:slug/auth`
- Se pendente: mostra ecra de aprovacao
- Se ativo: renderiza sidebar + conteudo

**Criar**: `src/components/club/ClubSidebar.tsx`
- Navegacao identica a que esta atualmente na sidebar do CRM (grupo FastClub)
- Todas as rotas apontam para `/club/fastclub/...` em vez de `/dashboard/fastclub/...`
- Separadores visuais: Zona Publica, Rede Privada, Zona Premium, Institucional
- Responsivo: colapsavel em mobile

### 2. Mover Rotas de `/dashboard/fastclub/*` para `/club/fastclub/*`

**Editar**: `src/App.tsx`
- Remover todas as 30 rotas `/dashboard/fastclub/...`
- Criar rotas equivalentes em `/club/fastclub/...` envolvidas no `ClubLayout`
- Manter `/club/:slug` (PublicCommunityPage) para visitantes nao autenticados
- Manter `/club/:slug/auth` para registo

Nova estrutura de rotas:

```text
/club/fastclub                     --> FastClubPage (hub principal)
/club/fastclub/start-here          --> StartHerePage
/club/fastclub/metodo-pare         --> MetodoParePage
/club/fastclub/metodo-pare/planeamento  --> PlaneamentoPage
/club/fastclub/metodo-pare/automacao    --> AutomacaoPage
/club/fastclub/metodo-pare/resultados   --> ResultadosParePage
/club/fastclub/metodo-pare/eficiencia   --> EficienciaPage
/club/fastclub/demos               --> DemosPage
/club/fastclub/demos/demonstracoes --> DemonstracoesPage
/club/fastclub/demos/casos-praticos --> CasosPraticosPage
/club/fastclub/demos/roadmap       --> RoadmapPage
/club/fastclub/resultados          --> ResultadosPage
/club/fastclub/rede-privada        --> RedePrivadaPage
/club/fastclub/rede-privada/...    --> (5 subpaginas)
/club/fastclub/missao-semana       --> MissaoSemanaPage
/club/fastclub/implementacao       --> ImplementacaoPage
/club/fastclub/ia-avancada         --> IAAvancadaPage
/club/fastclub/laboratorio         --> LaboratorioPage
/club/fastclub/hot-seats           --> HotSeatsPage
/club/fastclub/anuncios            --> AnunciosPage
/club/fastclub/atualizacoes        --> AtualizacoesPage
/club/fastclub/forum               --> ForumPage
/club/fastclub/forum/:topicId      --> ForumTopicPage
/club/fastclub/rewards             --> LoyaltyPage
/club/fastclub/desafio-7-dias      --> DesafioPage
/club/fastclub/fastmatch           --> FastMatchPage
```

### 3. Atualizar Todos os Links Internos

**Editar** (13 ficheiros em `src/pages/fastclub/`):
- Substituir todas as referencias a `/dashboard/fastclub` por `/club/fastclub`
- Inclui `navigate()`, `backPath`, `breadcrumbs`, links de CTAs

**Editar**: `src/components/fastclub/SubchannelLayout.tsx`
- Alterar `backPath` default de `/dashboard/fastclub` para `/club/fastclub`

**Editar**: `src/components/layout/PageBreadcrumbs.tsx`
- Alterar link Home de `/dashboard` para `/club/fastclub`

### 4. Atualizar `PublicCommunityPage.tsx`

**Editar**: `src/pages/community/PublicCommunityPage.tsx`
- Remover o redirect para `/dashboard/fastclub` (linha 63)
- Em vez disso, redirecionar membros ativos para `/club/fastclub` (mesmo dominio, agora com layout proprio)

### 5. Atualizar Sidebar do CRM

**Editar**: `src/components/layout/Sidebar.tsx`
- Simplificar o grupo FastClub: em vez de listar todos os subcanais, ter apenas um link "FastClub" que abre `/club/fastclub` (ou usa `window.location` para navegar fora do SPA do dashboard)
- Alternativa: manter como link externo com icone de "abrir"

### 6. Atualizar `FastClubPage.tsx`

**Editar**: `src/pages/community/FastClubPage.tsx`
- Atualizar todos os `navigate("/dashboard/fastclub/...")` para `/club/fastclub/...`
- Alterar botao "Voltar" de `/dashboard` para logica contextual

---

## Detalhe Tecnico

### Ficheiros a criar (2)

| Ficheiro | Descricao |
|---|---|
| `src/components/club/ClubLayout.tsx` | Layout principal com sidebar, auth gate, e conteudo |
| `src/components/club/ClubSidebar.tsx` | Sidebar de navegacao do FastClub |

### Ficheiros a editar (~20)

| Ficheiro | Alteracao |
|---|---|
| `src/App.tsx` | Mover rotas de `/dashboard/fastclub/*` para `/club/fastclub/*` |
| `src/components/layout/Sidebar.tsx` | Simplificar grupo FastClub para link unico |
| `src/pages/community/PublicCommunityPage.tsx` | Redirect para `/club/fastclub` |
| `src/pages/community/FastClubPage.tsx` | Atualizar todos os links internos |
| `src/components/fastclub/SubchannelLayout.tsx` | backPath default |
| `src/components/layout/PageBreadcrumbs.tsx` | Home link contextual |
| `src/pages/fastclub/StartHerePage.tsx` | Links internos |
| `src/pages/fastclub/MetodoParePage.tsx` | Links internos |
| `src/pages/fastclub/DemosPage.tsx` | Links internos |
| `src/pages/fastclub/RedePrivadaPage.tsx` | Links internos |
| `src/pages/fastclub/ResultadosPage.tsx` | Links internos |
| `src/pages/fastclub/AnunciosPage.tsx` | Links internos |
| `src/pages/fastclub/AtualizacoesPage.tsx` | Links internos |
| `src/pages/fastclub/MissaoSemanaPage.tsx` | Links internos |
| `src/pages/fastclub/IAAvancadaPage.tsx` | Links internos |
| `src/pages/fastclub/ImplementacaoPage.tsx` | Links internos |
| `src/pages/fastclub/LaboratorioPage.tsx` | Links internos |
| `src/pages/fastclub/FastMatchPage.tsx` | Links internos |
| Subpaginas em `metodo-pare/`, `demos/`, `rede-privada/` | Breadcrumbs e backPath |

### Sem migracoes SQL

Nao ha alteracoes na base de dados. Toda a logica e de routing e UI.

### Ordem de execucao

1. Criar `ClubLayout` + `ClubSidebar` (componentes base)
2. Atualizar `App.tsx` (mover rotas)
3. Atualizar `PublicCommunityPage.tsx` (redirect)
4. Atualizar todos os ficheiros de paginas (links internos) — em batch
5. Simplificar sidebar do CRM
