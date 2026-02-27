

# Reorganizar Sidebar V2 com Metodologia Attio

## Problema Actual

A Sidebar V2 renderiza uma lista plana de ~19 itens sem qualquer agrupamento, favoritos, ou secoes colapsaveis. Falta-lhe a estrutura organizada do Attio: itens core no topo, secoes colapsaveis para sub-modulos, e favoritos do utilizador.

## Abordagem Attio

O Attio usa:
1. **Quick Actions** no topo (ja existe)
2. **Itens core planos** — Home, Notifications, Tasks, Notes, Emails, Calls, Reports
3. **Secoes colapsaveis** com chevron — Automations > Sequences, Workflows
4. **Favoritos** — secao com pins do utilizador
5. **Sem group labels excessivos** — apenas para secoes colapsaveis

## Alteracoes

### 1. `src/config/nav.v2.ts` — Reestruturar com grupos colapsaveis

Novo formato com dois tipos de item:
- **Itens directos** (flat, sempre visiveis): Home, Mural, Inbox, Ask, Tasks, Reports, Settings
- **Grupos colapsaveis** com children: CRM (Leads, Contactos, Empresas, Oportunidades), Vendas (Pipeline, Propostas, Faturas, Produtos), Portal B2B, Loja Online, Marketplace C2C, FastClub, Marketing, Estrategia, Ferramentas, Student Journey, Instagram Looter

```text
Sidebar V2 (Attio-style)
─────────────────────────
[Workspace Logo + Name]
[Workspace Switcher]
[Plan Badge]

Quick Actions          ⌘K
─────────────────────────
★ Favoritos (se houver)
─────────────────────────
⬡ Home
📰 Mural
📥 Inbox
✨ Ask
📊 Reports
─────────────────────────
▸ CRM
  Leads, Contactos, Empresas,
  Oportunidades, Tarefas, Eventos
▸ Vendas
  Pipeline, Propostas, Faturas,
  Agendamento, Produtos
▸ Portal B2B
  Notas Encomenda, Aprovacoes,
  Clientes, Produtos, Stock, Config
▸ Loja Online
  Produtos, Encomendas, Categorias
▸ Marketplace C2C
  Marketplace, Area Vendedor, ...
▸ FastClub
  Abrir, Candidaturas
▸ Marketing
  Marketing, Email, Google Local,
  Funis, Bio OS
▸ Estrategia
  Brief Executivo
▸ Relatorios
  KPIs, Metas, Previsoes, Consumo
▸ Ferramentas
  Automacoes, AI, SEO, Imports, ...
▸ Student Journey
  Painel, Perfis, Cursos, Turmas
▸ Instagram Looter
  Busca, Hashtags, Localizacao, ...
─────────────────────────
⚙ Definicoes
```

### 2. `src/components/layout/Sidebar.tsx` — Redesenhar com logica Attio

- Adicionar `useSidebarFavorites` (ja existe no V1)
- Adicionar Quick Actions bar (como V1)
- Renderizar **Favoritos** no topo se existirem
- Renderizar **itens core** como links planos
- Renderizar **grupos colapsaveis** com estado open/closed (usando state local ou Collapsible do Radix)
- Manter grupo aberto automaticamente se contem a rota activa
- Manter o visual dark gradient existente
- Manter extensionGroups no final

### 3. `src/config/nav.v1.ts` — Sem alteracoes

O V1 ja tem os itens todos. Mantem-se como esta.

## Ficheiros a alterar

| Ficheiro | Accao |
|---|---|
| `src/config/nav.v2.ts` | Reestruturar: itens core + grupos colapsaveis com todos os ~60 sub-itens |
| `src/components/layout/Sidebar.tsx` | Redesenhar: Quick Actions, Favoritos, itens core planos, grupos colapsaveis estilo Attio |

