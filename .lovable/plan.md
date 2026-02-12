

# Fase 6: Laboratorio Fast + Hot Seats + Refinamentos Finais

Esta fase adiciona as duas ultimas paginas premium do ecossistema FastClub e aplica refinamentos visuais e de navegacao a todo o conjunto.

---

## O que esta incluido

### 1. Pagina "Laboratorio Fast" (`/dashboard/fastclub/laboratorio`)

Espaco experimental onde membros premium testam novas funcionalidades, workflows e templates antes de serem lancados publicamente:

- Header executivo com badge "Beta" e descricao do conceito
- Grid de "Experimentos" -- cada um e um card com titulo, descricao, estado (Ativo / Em Breve / Concluido) e CTA
- Seccao "Feedback" com formulario inline para os membros darem opiniao sobre os experimentos
- Dados de `fastclub_content_sections` com `page_key = 'laboratorio'`
- Envolvido em `PremiumGate`
- Dados semente: 4 experimentos exemplo (ex: "Pipeline Kanban v2", "IA Qualificacao Automatica", "Widget WhatsApp", "Relatorios Avancados")

### 2. Pagina "Hot Seats" (`/dashboard/fastclub/hot-seats`)

Sessoes de mentoria ao vivo onde membros apresentam o seu caso e recebem feedback do grupo:

- Header com descricao do conceito (sessoes de grupo focadas)
- Lista de proximas sessoes (data, hora, tema, vagas) -- cards visuais com countdown
- Historico de sessoes anteriores (colapsavel) com resumo e takeaways
- Botao "Inscrever-me" com CTA para o FastCRM (deep-link SSO)
- Dados de `fastclub_content_sections` com `page_key = 'hot-seats'`
- Envolvido em `PremiumGate`
- Dados semente: 3 sessoes futuras + 2 sessoes passadas

### 3. Refinamentos Finais

- **Separador visual na sidebar**: Adicionar um separador/label "Zona Premium" antes dos items premium para melhor hierarquia visual
- **Ordenacao da sidebar**: Garantir ordem logica: paginas de conteudo base primeiro, depois zona premium
- **Landing page `/fastclub`**: Adicionar links para as novas paginas na seccao de ecossistema (se aplicavel)

---

## Ficheiros a criar

| Ficheiro | Descricao |
|---|---|
| `src/pages/fastclub/LaboratorioPage.tsx` | Laboratorio de experimentos premium |
| `src/pages/fastclub/HotSeatsPage.tsx` | Sessoes de mentoria Hot Seats |

## Ficheiros a editar

| Ficheiro | Acao |
|---|---|
| `src/App.tsx` | Adicionar 2 rotas novas |
| `src/components/layout/Sidebar.tsx` | Adicionar 2 items premium + separador visual "Zona Premium" |

---

## Detalhe tecnico

### Dados semente

Inserir conteudo em `fastclub_content_sections`:

**Laboratorio** (page_key = 'laboratorio', 4 registos):
- section_key: `exp-pipeline-v2`, titulo: "Pipeline Kanban v2", metadata: `{ estado: "Ativo", tipo: "Feature" }`
- section_key: `exp-ia-qualificacao`, titulo: "IA Qualificacao Automatica", metadata: `{ estado: "Ativo", tipo: "IA" }`
- section_key: `exp-widget-whatsapp`, titulo: "Widget WhatsApp Integrado", metadata: `{ estado: "Em Breve", tipo: "Integracao" }`
- section_key: `exp-relatorios`, titulo: "Relatorios Avancados", metadata: `{ estado: "Em Breve", tipo: "Analytics" }`

**Hot Seats** (page_key = 'hot-seats', 5 registos):
- 3 sessoes futuras com metadata: `{ data: "2026-02-20", hora: "10:00", tema: "...", vagas: 8, tipo: "futuro" }`
- 2 sessoes passadas com metadata: `{ data: "2026-01-15", tipo: "passado", takeaways: ["...", "..."] }`

### Pagina LaboratorioPage

- Envolvida em `PremiumGate` com `featureLabel="Laboratório Fast"`
- Botao "Voltar" no topo
- Header com gradiente executivo, badge "Beta" em amarelo
- Grid de cards de experimentos com:
  - Titulo e descricao
  - Badge de estado (Ativo = verde, Em Breve = amarelo, Concluido = cinza)
  - Badge de tipo (Feature, IA, Integracao, Analytics)
  - CTA "Experimentar" (deep-link SSO) para experimentos ativos
- Seccao de feedback com textarea e botao "Enviar Feedback" (toast de confirmacao, sem persistencia nesta fase)
- Animacoes framer-motion (fade + stagger)

### Pagina HotSeatsPage

- Envolvida em `PremiumGate` com `featureLabel="Hot Seats"`
- Botao "Voltar" no topo
- Seccao "Proximas Sessoes" com cards visuais:
  - Data e hora com formatacao
  - Tema da sessao
  - Numero de vagas restantes com badge
  - CTA "Inscrever-me" via `FastCRMDeepLink`
- Seccao "Sessoes Anteriores" em Accordion:
  - Titulo e data
  - Lista de takeaways
- Animacoes framer-motion consistentes

### Sidebar -- separador visual e novos items

Adicionar um label/separador "Zona Premium" antes dos items premium no grupo FastClub. Depois adicionar:

```typescript
// Antes dos items premium, inserir separador visual
// Novos items:
{ name: "Laboratório Fast", href: "/dashboard/fastclub/laboratorio", icon: FlaskConical, tooltip: "Experimentos e funcionalidades beta" },
{ name: "Hot Seats", href: "/dashboard/fastclub/hot-seats", icon: Mic, tooltip: "Sessões de mentoria ao vivo" },
```

Ordem final dos items premium na sidebar:
1. Missao da Semana
2. Implementacao Guiada
3. IA Avancada
4. FastMatch Hub
5. Laboratorio Fast
6. Hot Seats

### Padrao visual

Consistente com todas as paginas anteriores:
- Botao "Voltar" com `ArrowLeft`
- Titulo e subtitulo com badges
- Cards com gradientes subtis e hover com elevacao
- Animacoes `motion.div` com stagger (delay 0.05-0.1s)
- Empty states motivacionais
- CTAs via `FastCRMDeepLink` onde aplicavel

