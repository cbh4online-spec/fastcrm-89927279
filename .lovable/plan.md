
# Estrutura Completa de Canais e Subcanais do FastClub

## Contexto Atual

O FastClub ja possui paginas dedicadas para cada seccao (StartHerePage, MetodoParePage, DemosPage, RedePrivadaPage, etc.) e usa a tabela `fastclub_content_sections` para conteudo dinamico. A sidebar tem os items organizados mas falta:

- **Subcanais** dentro de cada canal principal (ex: Metodo PARE com 4 subpaginas P/A/R/E)
- **Pagina de Atualizacoes do Ecossistema** (comunicacao institucional)
- **Subcanalização da Rede Privada** (5 subcanais educativos)
- **Subcanalização do FastCRM em Acao** (3 subcanais)
- **Navegacao hierarquica** na sidebar com submenus collapsiveis
- **Controlo de permissoes** (Free vs Premium vs Admin) na UI

---

## 1. Reestruturar Sidebar com Subcanais Collapsiveis

Modificar o tipo `NavItem` em `Sidebar.tsx` para suportar `children: NavItem[]` e renderizar submenus collapsiveis.

### Estrutura de navegacao pretendida:

```text
ZONA PUBLICA (Free + Premium)
  Start Here                     /dashboard/fastclub/start-here
  Metodo PARE                    (colapsavel)
    Planeamento                  /dashboard/fastclub/metodo-pare/planeamento
    Automacao                    /dashboard/fastclub/metodo-pare/automacao
    Resultados                   /dashboard/fastclub/metodo-pare/resultados
    Eficiencia                   /dashboard/fastclub/metodo-pare/eficiencia
  FastCRM em Acao                (colapsavel)
    Demonstracoes                /dashboard/fastclub/demos/demonstracoes
    Casos Praticos               /dashboard/fastclub/demos/casos-praticos
    Roadmap & Atualizacoes       /dashboard/fastclub/demos/roadmap
  Resultados                     /dashboard/fastclub/resultados

HUB REDE PRIVADA
  Rede Privada                   (colapsavel)
    Como Funciona                /dashboard/fastclub/rede-privada/como-funciona
    Otimizar Perfil              /dashboard/fastclub/rede-privada/otimizar-perfil
    Indicadores da Rede          /dashboard/fastclub/rede-privada/indicadores
    Negocios Fechados            /dashboard/fastclub/rede-privada/negocios-fechados
    Estrategias de Abordagem     /dashboard/fastclub/rede-privada/estrategias

---- ZONA PREMIUM ----
  Missao da Semana               /dashboard/fastclub/missao-semana
  Implementacao Guiada           /dashboard/fastclub/implementacao
  IA & Automacoes                /dashboard/fastclub/ia-avancada
  Laboratorio Fast               /dashboard/fastclub/laboratorio

COMUNICACAO INSTITUCIONAL
  Anuncios Oficiais              /dashboard/fastclub/anuncios
  Atualizacoes do Ecossistema    /dashboard/fastclub/atualizacoes
  Conta & Plano                  /dashboard/settings/billing
```

---

## 2. Subpaginas do Metodo PARE

Converter `MetodoParePage.tsx` de pagina unica com os 4 pilares numa pagina de **hub** com links para 4 subpaginas dedicadas.

Criar: `src/pages/fastclub/metodo-pare/PlaneamentoPage.tsx`
Criar: `src/pages/fastclub/metodo-pare/AutomacaoPage.tsx`
Criar: `src/pages/fastclub/metodo-pare/ResultadosParePage.tsx`
Criar: `src/pages/fastclub/metodo-pare/EficienciaPage.tsx`

Cada subpagina tera:
- Conteudo educacional (carregado de `fastclub_content_sections` com `page_key` = `pare-planeamento`, etc.)
- Templates (lista de recursos)
- Videos (placeholders para URLs)
- Sem discussao livre (sem forum/comentarios)
- CTA "Abrir FastCRM" com deep-link contextual

Manter `MetodoParePage.tsx` como hub com cards linkando para cada subpagina.

---

## 3. Subcanais do FastCRM em Acao

Expandir `DemosPage.tsx` numa estrutura com 3 subpaginas:

Criar: `src/pages/fastclub/demos/DemonstracaoesPage.tsx` — Videos e demos interativos
Criar: `src/pages/fastclub/demos/CasosPraticosPage.tsx` — Casos reais com comentarios moderados
Criar: `src/pages/fastclub/demos/RoadmapPage.tsx` — Roadmap e notas de atualizacao

Cada subcanal carrega conteudo de `fastclub_content_sections` com `page_key` contextual.
Comentarios moderados apenas em Casos Praticos (usando o sistema de forum existente com `forum_topics` filtrado por `category_id`).
CTA fixo "Abrir FastCRM" em todas.

Manter `DemosPage.tsx` como hub com links para os 3 subcanais.

---

## 4. Subcanais da Rede Privada

Expandir `RedePrivadaPage.tsx` numa estrutura com 5 subpaginas:

Criar: `src/pages/fastclub/rede-privada/ComoFuncionaPage.tsx`
  - Regras da rede, etica, estrutura de quotas

Criar: `src/pages/fastclub/rede-privada/OtimizarPerfilPage.tsx`
  - Modelos de oferta e procura, exemplos corretos vs incorretos

Criar: `src/pages/fastclub/rede-privada/IndicadoresPage.tsx`
  - Dados agregados de `fastmatch_profiles` e `fastmatch_connections`
  - Oportunidades semanais, membros verificados, tendencias setoriais, taxa de resposta

Criar: `src/pages/fastclub/rede-privada/NegociosFechadosPage.tsx`
  - Casos reais aprovados com formato estruturado (template obrigatorio)
  - Dados de `fastclub_content_sections` com `page_key = 'negocios-fechados'`

Criar: `src/pages/fastclub/rede-privada/EstrategiasPage.tsx`
  - Como qualificar, comunicar e converter

Todas com CTA fixo: "Abrir FastMatch no CRM" (deep-link para `/dashboard/fastmatch`).

Manter `RedePrivadaPage.tsx` como hub com stats agregados e links para cada subcanal.

---

## 5. Pagina de Atualizacoes do Ecossistema

Criar: `src/pages/fastclub/AtualizacoesPage.tsx`
- Novas funcionalidades, evolucao do roadmap, integracoes
- Dados de `fastclub_content_sections` com `page_key = 'atualizacoes'`
- Badges: "Nova Funcionalidade", "Integracao", "Melhoria"
- Sem comentarios (apenas admin publica)

---

## 6. Componentes Reutilizaveis

### Criar: `src/components/fastclub/SubchannelLayout.tsx`
Layout padrao para subcanais com:
- Header com gradiente e badge de zona
- Breadcrumb (ex: FastClub > Metodo PARE > Planeamento)
- Container de conteudo
- CTA fixo no fundo

### Criar: `src/components/fastclub/ClosedCaseTemplate.tsx`
Template obrigatorio para "Caso Fechado" com:
- Contexto
- Acao
- Resultado
- Metrica
Estilo executivo, sem emojis.

### Criar: `src/components/fastclub/WeeklyMissionTemplate.tsx`
Template para "Missao da Semana" com:
- Objetivo
- Passos
- Implementacao no CRM
- Resultado esperado

### Criar: `src/components/fastclub/AggregatedDashboard.tsx`
Dashboard de indicadores agregados para a Rede Privada:
- Cards com metricas de `fastmatch_profiles` e `fastmatch_connections`
- Grafico simples de tendencia (opcional, com recharts)

---

## 7. Controlo de Permissoes na UI

Utilizar o hook existente `useFastClubMembership()` para controlar acesso:

| Zona | Visitor | Free | Premium | Admin |
|---|---|---|---|---|
| Start Here | -- | Sim | Sim | Sim |
| Metodo PARE + sub | -- | Sim | Sim | Sim |
| FastCRM em Acao + sub | -- | Sim | Sim | Sim |
| Resultados | -- | Sim | Sim | Sim |
| Rede Privada + sub | -- | Sim | Sim | Sim |
| Zona Premium | -- | -- | Sim | Sim |
| Anuncios (publicar) | -- | -- | -- | Sim |
| Atualizacoes (publicar) | -- | -- | -- | Sim |

Na sidebar: items premium ja utilizam o separador "Zona Premium". Adicionar `PremiumGate` (ja existente) nas subpaginas premium.
Na sidebar: Anuncios visiveis a todos; publicacao restrita a admin via logica na pagina.

---

## 8. Rotas Novas no App.tsx

Adicionar rotas aninhadas:

```text
/dashboard/fastclub/metodo-pare/planeamento
/dashboard/fastclub/metodo-pare/automacao
/dashboard/fastclub/metodo-pare/resultados
/dashboard/fastclub/metodo-pare/eficiencia
/dashboard/fastclub/demos/demonstracoes
/dashboard/fastclub/demos/casos-praticos
/dashboard/fastclub/demos/roadmap
/dashboard/fastclub/rede-privada/como-funciona
/dashboard/fastclub/rede-privada/otimizar-perfil
/dashboard/fastclub/rede-privada/indicadores
/dashboard/fastclub/rede-privada/negocios-fechados
/dashboard/fastclub/rede-privada/estrategias
/dashboard/fastclub/atualizacoes
```

---

## Detalhe Tecnico

### Ficheiros a criar (16 ficheiros)

| Ficheiro | Descricao |
|---|---|
| `src/pages/fastclub/metodo-pare/PlaneamentoPage.tsx` | Subpagina P |
| `src/pages/fastclub/metodo-pare/AutomacaoPage.tsx` | Subpagina A |
| `src/pages/fastclub/metodo-pare/ResultadosParePage.tsx` | Subpagina R |
| `src/pages/fastclub/metodo-pare/EficienciaPage.tsx` | Subpagina E |
| `src/pages/fastclub/demos/DemonstracaoesPage.tsx` | Demos interativos |
| `src/pages/fastclub/demos/CasosPraticosPage.tsx` | Casos com comentarios |
| `src/pages/fastclub/demos/RoadmapPage.tsx` | Roadmap e atualizacoes |
| `src/pages/fastclub/rede-privada/ComoFuncionaPage.tsx` | Regras e etica |
| `src/pages/fastclub/rede-privada/OtimizarPerfilPage.tsx` | Modelos oferta/procura |
| `src/pages/fastclub/rede-privada/IndicadoresPage.tsx` | Dashboard agregado |
| `src/pages/fastclub/rede-privada/NegociosFechadosPage.tsx` | Casos reais |
| `src/pages/fastclub/rede-privada/EstrategiasPage.tsx` | Qualificacao e conversao |
| `src/pages/fastclub/AtualizacoesPage.tsx` | Comunicacao institucional |
| `src/components/fastclub/SubchannelLayout.tsx` | Layout reutilizavel |
| `src/components/fastclub/ClosedCaseTemplate.tsx` | Template caso fechado |
| `src/components/fastclub/AggregatedDashboard.tsx` | Dashboard indicadores |

### Ficheiros a editar (4 ficheiros)

| Ficheiro | Alteracao |
|---|---|
| `src/components/layout/Sidebar.tsx` | Adicionar suporte a `children` no NavItem, reorganizar FastClub com submenus collapsiveis, separadores de zona |
| `src/App.tsx` | Adicionar 13 rotas novas |
| `src/pages/fastclub/MetodoParePage.tsx` | Converter em hub com links para subpaginas |
| `src/pages/fastclub/DemosPage.tsx` | Converter em hub com links para subcanais |
| `src/pages/fastclub/RedePrivadaPage.tsx` | Converter em hub com links para subcanais |

### Sem migracoes SQL

Todo o conteudo dinamico utiliza a tabela `fastclub_content_sections` existente com novos `page_key` values. Os indicadores da rede utilizam `fastmatch_profiles` e `fastmatch_connections` ja existentes.

### Ordem de implementacao

1. `SubchannelLayout.tsx` + `ClosedCaseTemplate.tsx` + `AggregatedDashboard.tsx` (componentes base)
2. Subpaginas do Metodo PARE (4 paginas)
3. Subcanais do FastCRM em Acao (3 paginas)
4. Subcanais da Rede Privada (5 paginas)
5. `AtualizacoesPage.tsx`
6. Sidebar com submenus collapsiveis
7. App.tsx com todas as rotas
8. Conversao de hub pages (MetodoParePage, DemosPage, RedePrivadaPage)
