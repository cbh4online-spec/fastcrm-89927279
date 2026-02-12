

# Fase 3: Zona Premium (Missao da Semana, Implementacao Guiada, IA Avancada)

Esta fase cria as 3 primeiras paginas da zona premium do FastClub, acessiveis apenas a membros premium. Cada pagina usa o `PremiumGate` existente para controlo de acesso e segue o padrao visual executivo ja estabelecido.

---

## O que esta incluido

### 1. Pagina "Missao da Semana" (`/dashboard/fastclub/missao-semana`)

Missao semanal orientada a execucao real no FastCRM:
- Card destaque com a missao atual (titulo, descricao, objetivo, CTA deep-link)
- Checklist de passos (3-5 sub-tarefas)
- Historico de missoes anteriores (colapsavel)
- Dados vem de `fastclub_content_sections` com `page_key = 'missao-semana'`
- Dados semente: 4 missoes exemplo

### 2. Pagina "Implementacao Guiada" (`/dashboard/fastclub/implementacao`)

Biblioteca de playbooks e checklists para implementar o FastCRM:
- Cards de playbooks organizados por categoria (Onboarding, Pipeline, Automacoes, Integracao)
- Cada playbook tem titulo, descricao, duracao estimada, nivel (Basico/Intermedio/Avancado) e checklist de passos
- Filtro por categoria
- Dados de `fastclub_content_sections` com `page_key = 'implementacao'`
- Dados semente: 6 playbooks exemplo

### 3. Pagina "IA e Automacoes Avancadas" (`/dashboard/fastclub/ia-avancada`)

Conteudo avancado sobre IA e automacoes no FastCRM:
- Cards de templates/praticas organizados por tipo (Automacoes, Prompts IA, Fluxos, Integracao)
- Cada card com titulo, descricao, complexidade, CTA para o FastCRM
- Seccao "Dicas Rapidas" com snippets curtos
- Dados de `fastclub_content_sections` com `page_key = 'ia-avancada'`
- Dados semente: 6 templates + 4 dicas

### 4. Navegacao atualizada

- 3 novos items na sidebar do FastClub (separados visualmente como zona premium com icone de cadeado)
- 3 novas rotas no App.tsx

---

## Ficheiros a criar

| Ficheiro | Descricao |
|---|---|
| `src/pages/fastclub/MissaoSemanaPage.tsx` | Missao da Semana com card destaque e historico |
| `src/pages/fastclub/ImplementacaoPage.tsx` | Playbooks e checklists de implementacao |
| `src/pages/fastclub/IAAvancadaPage.tsx` | Templates IA e automacoes avancadas |

## Ficheiros a editar

| Ficheiro | Acao |
|---|---|
| `src/App.tsx` | Adicionar 3 rotas novas |
| `src/components/layout/Sidebar.tsx` | Adicionar 3 items premium com separador visual |

---

## Detalhe tecnico

### Dados semente (insert via tool, sem migracao)

Inserir conteudo nas tabelas existentes `fastclub_content_sections`:

**Missao da Semana** (page_key = 'missao-semana', 4 registos):
- Semana 1: "Configurar pipeline completo" -- passos no metadata (JSON array)
- Semana 2: "Automatizar follow-up de leads"
- Semana 3: "Criar proposta modelo com IA"
- Semana 4: "Ativar fluxo de onboarding"

**Implementacao Guiada** (page_key = 'implementacao', 6 registos):
- Playbooks com metadata incluindo: categoria, duracao, nivel, checklist (JSON)

**IA Avancada** (page_key = 'ia-avancada', 10 registos):
- 6 templates (automacao email, qualificacao IA, fluxo WhatsApp, etc.)
- 4 dicas rapidas (section_key = 'dica')

### Sidebar -- zona premium separada

Atualizar o array `navigationGroups` no Sidebar.tsx para adicionar 3 items ao grupo FastClub, com separacao visual. Os items premium terao `highlight: false` e serao visualmente distintos com o icone Crown ja suportado pelo `renderNavItem`.

Novos items:
```typescript
{ name: "Missão da Semana", href: "/dashboard/fastclub/missao-semana", icon: CalendarClock, tooltip: "Missão semanal premium" },
{ name: "Implementação Guiada", href: "/dashboard/fastclub/implementacao", icon: BookOpen, tooltip: "Playbooks e checklists" },
{ name: "IA Avançada", href: "/dashboard/fastclub/ia-avancada", icon: Brain, tooltip: "Templates IA e automações" },
```

### Pagina MissaoSemanaPage

- Envolvida em `PremiumGate` com `featureLabel="Missão da Semana"`
- Card principal grande com a missao mais recente (sort_order mais alto)
- Sub-tarefas renderizadas como checklist visual (apenas display, sem tracking nesta fase)
- Historico em accordion colapsavel com missoes anteriores
- Animacoes framer-motion (fade + stagger) consistentes com as paginas existentes
- CTA "Executar no FastCRM" em cada missao

### Pagina ImplementacaoPage

- Envolvida em `PremiumGate`
- Filtro por categoria no topo (tabs ou chips)
- Grid de cards com: titulo, descricao curta, badge de nivel, duracao estimada
- Ao expandir card: checklist completa com passos numerados
- Cada passo com CTA opcional para o FastCRM

### Pagina IAAvancadaPage

- Envolvida em `PremiumGate`
- Seccao "Templates e Praticas" com grid de cards (tipo, complexidade, descricao)
- Seccao "Dicas Rapidas" com cards compactos
- Cada template com botao "Aplicar no FastCRM"
- Filtro por tipo (Automacoes, Prompts, Fluxos, Integracao)

### Padrao visual

Todas as paginas seguem o padrao visual ja estabelecido:
- Botao "Voltar" no topo com `ArrowLeft`
- Titulo e subtitulo com badges
- Animacoes `motion.div` com `stagger` (delay sequencial de 0.05-0.1s)
- Cards com gradientes subtis e hover elevacao
- CTAs recorrentes para o FastCRM com icone `ArrowRight`

