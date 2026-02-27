

# Corrigir Sidebar V2: Esconder Todos os Grupos Sem Modulos

## Problema

Os grupos colapsaveis (CRM, Vendas, Marketing, Relatorios, Ferramentas) nao tem `moduleSlug` atribuido, por isso aparecem sempre mesmo sem modulos instalados. Alem disso, itens individuais dentro desses grupos (Pipeline, Agendamento, Produtos, Funis, Automacoes, etc.) tambem nao tem `moduleSlug`.

O utilizador quer que sem modulos instalados so aparecam os itens core planos: Home, Mural, Inbox, Ask, Reports e Settings.

## Dados Atuais da BD

Workspace METODOPARE tem apenas 3 modulos ativos: `proposals`, `invoices`, `seo-growth`. Todos os outros estao cancelados.

## Solucao

### 1. `src/config/nav.v2.ts` — Adicionar moduleSlug a TODOS os grupos

Cada grupo colapsavel precisa de pelo menos um `moduleSlug` no grupo ou em todos os seus children para garantir que desaparece quando nenhum modulo relevante esta instalado.

**Nova logica**: Um grupo so aparece se pelo menos 1 child tem o seu `moduleSlug` nos `installedModuleIds`.

| Grupo | Acao |
|---|---|
| CRM | Adicionar `moduleSlug: "crm"` (core — ver ponto 3) |
| Vendas | Remover children sem moduleSlug ou adicionar moduleSlug a cada child |
| Marketing | Adicionar moduleSlug a cada child |
| Relatorios | Adicionar `moduleSlug: "reports"` (core — ver ponto 3) |
| Ferramentas | Adicionar moduleSlug a cada child |

**Abordagem alternativa (mais simples e correta)**: Em vez de inventar slugs fictícios, mudar a logica no Sidebar:

- Mover os itens essenciais (Leads, Contactos, Empresas, Oportunidades, Pipeline) para `NAV_V2_CORE` como itens planos sempre visíveis
- Todos os grupos colapsáveis ficam 100% dependentes de moduleSlug
- Children sem moduleSlug dentro de um grupo com moduleSlug herdam a visibilidade do grupo pai

### 2. `src/config/nav.v2.ts` — Reestruturar NAV_V2_CORE e NAV_V2_GROUPS

**NAV_V2_CORE** (sempre visivel):
- Home, Mural, Inbox, Ask, Reports (ja existem)
- Adicionar: Leads, Contactos, Empresas, Oportunidades, Pipeline, Tarefas, Agendamento, Produtos (itens CRM/Vendas base)

**NAV_V2_GROUPS** — todos com moduleSlug obrigatorio:
- Vendas: moduleSlug nos children (proposals, invoices)
- Portal B2B: moduleSlug `b2b-portal` (ja tem)
- Loja Online: moduleSlug `online-store` (ja tem)
- Marketplace C2C: moduleSlug `marketplace-c2c` (ja tem)
- FastClub: moduleSlug `fastclub` (ja tem)
- Marketing: moduleSlug nos children (email-campaigns, google-local-services, bio-os) + item base "Marketing" com moduleSlug
- Estrategia: moduleSlug `strategy-brief` (ja tem)
- Relatorios: mover para core ou dar moduleSlug
- Ferramentas: moduleSlug nos children (seo-growth, conversational-engine) + restantes com moduleSlug
- Student Journey: moduleSlug `student-journey` (ja tem)
- Instagram Looter: moduleSlug `instagram-looter` (ja tem)

### 3. `src/components/layout/Sidebar.tsx` — Ajustar logica de filtragem

A logica de filtragem ja esta correta (filtra por moduleSlug). A unica mudanca e garantir que a heranca de grupo funciona: se o grupo tem moduleSlug, todos os children herdam essa visibilidade.

Alterar `filteredGroups`:
```
// Se grupo tem moduleSlug, verificar esse slug
// Se grupo nao tem moduleSlug, verificar que pelo menos 1 child tem moduleSlug nos installedModuleIds
// Children sem moduleSlug num grupo COM moduleSlug sao sempre visiveis (herdam do pai)
```

## Ficheiros a alterar

| Ficheiro | Acao |
|---|---|
| `src/config/nav.v2.ts` | Mover CRM/Vendas base items para NAV_V2_CORE; garantir todos os grupos tem moduleSlug |
| `src/components/layout/Sidebar.tsx` | Ajustar filteredGroups para heranca de moduleSlug grupo→children; esconder grupos sem modulos |

