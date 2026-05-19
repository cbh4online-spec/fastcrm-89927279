# Reorganização do FastCRM por Departamentos

## Diagnóstico

Hoje o sidebar usa NavGroups técnicos (`comunicacao`, `agenda`, `core`, `ai-strategy`, etc.) definidos em `src/config/routeManifest.ts`. O utilizador quer uma estrutura **departamental** — espelhando como uma empresa real está organizada — que sirva também como **alavanca comercial**: cada plano/assinatura ativa apenas os departamentos contratados.

## Decisões de Produto

### Departamentos propostos (SSoT)
1. **Administração** — workspace, equipa, permissões, billing, integrações, super-admin
2. **Comercial / Vendas** — CRM, leads, contactos, empresas, pipeline, propostas, deal intelligence, AI SDR
3. **Marketing** — campanhas, automações, funis, landing pages, SEO, growth insights, lead enrichment
4. **Comunicação** — inbox, WhatsApp, telegram, voicehub, groups, templates, sequences
5. **Agenda & Produtividade** — calendário, follow-ups, agendamentos, tarefas
6. **Financeiro** — faturas, recibos, pagamentos, cobranças (collections), renewals, KPIs financeiros
7. **Compras & Procurement** — fornecedores, ordens de compra, importação de produtos, staging
8. **Logística & Stock** — armazéns, inventário, movimentos, expedição
9. **Catálogo & Produtos** — produtos, categorias, atributos, pricing rules
10. **Loja Online (B2C/B2B/C2C)** — storefronts, marketplace, lives, partner center
11. **Recursos Humanos** — colaboradores, departamentos HR, candidatos, onboarding, leave
12. **Helpdesk & Suporte** — tickets, helpdesk, base de conhecimento
13. **Inteligência & IA** — exec command, account brief, AI agents, assistants, RAG, automações IA
14. **Relatórios & Analytics** — reports, KPIs, revenue flight control, performance

### Configurabilidade por assinatura
- Cada departamento é uma **entidade declarativa** com `slug`, `nome`, `ícone`, `ordem`, `módulos[]` (slugs do `moduleNavRegistry`).
- Visibilidade depende de:
  1. **Plano/assinatura** (subscription tier do workspace)
  2. **Módulos instalados** (`workspace_modules`)
  3. **Permissões do perfil** (`profile_menu_permissions`)
  4. **Override de Super Admin** (toggle manual por workspace)
- Departamento sem módulos visíveis → oculto automaticamente
- Departamento bloqueado por plano → mostra com cadeado + CTA "Fazer upgrade"

## Estrutura Técnica

### Novos ficheiros
- `src/config/departments.ts` — SSoT dos departamentos (DEPARTMENT_REGISTRY)
- `src/hooks/useDepartmentVisibility.ts` — calcula departamentos visíveis cruzando plano + módulos + permissões
- `src/components/sidebar/DepartmentSidebar.tsx` — novo componente que renderiza por departamento (substitui agrupamento atual)

### Alterações
- `src/config/routeManifest.ts` — adicionar campo opcional `department: DepartmentSlug` em cada RouteEntry
- Migration: nova tabela `workspace_department_overrides` (workspace_id, department_slug, enabled, locked_by_plan)
- Página `/settings/departments` (super admin + owner) — toggle visual por departamento, mostra módulos contidos e estado de assinatura

### Mapeamento Plano → Departamentos (proposta inicial)
```text
START   → Administração, Comercial, Comunicação, Agenda
GROW    → + Marketing, Financeiro, Helpdesk, Relatórios
PRO     → + Compras, Logística, Catálogo, Loja, HR, IA
ENTERPRISE → todos + overrides custom
```

## Plano de Implementação (faseado)

**Fase 1 — Fundação (esta entrega)**
1. Criar `DEPARTMENT_REGISTRY` com os 14 departamentos
2. Anotar cada RouteEntry do `routeManifest.ts` com `department`
3. Refactor do sidebar para agrupar por departamento (collapsible, ícone próprio)
4. Hook `useDepartmentVisibility` (versão inicial: só esconde departamentos sem rotas visíveis)

**Fase 2 — Configurabilidade**
5. Migration `workspace_department_overrides` + RLS
6. Página `/settings/departments` (toggle por workspace)
7. Mapping plano → departamentos no `SubscriptionContext`
8. Estado "bloqueado por plano" com CTA de upgrade

**Fase 3 — Comercial**
9. Pricing page por departamento (marketing)
10. Bundles ("Pack Vendas", "Pack Operações")
11. Telemetria de cliques em departamentos bloqueados

## Critérios de Aceitação (Fase 1)

- Sidebar agrupa 100% das rotas ativas por um dos 14 departamentos
- Nenhuma rota órfã (teste automático)
- Departamento sem rotas visíveis fica oculto
- Estado collapsed/expanded persiste por departamento
- Departamento que contém a rota ativa abre automaticamente
- Sem regressão em `routeManifest` tests existentes

## Riscos / Pontos por Validar

- **Sobreposição**: algumas rotas servem >1 departamento (ex.: WhatsApp serve Comunicação E Comercial). Decisão: 1 rota = 1 departamento "primário"; restantes acedem via search/shortcuts.
- **Naming**: confirmar nomes PT-PT exactos antes de implementar
- **Plano atual**: preciso confirmar como o workspace expõe o tier de subscrição (já há `SubscriptionContext`?)
- **HR Departments ≠ Departamentos do Produto**: o conceito "departamento" no UI será o do PRODUTO; os `hr_departments` continuam isolados no módulo HR

## Dúvida crítica antes de avançar

Avanço já com a **Fase 1** (estrutura visual no sidebar pelos 14 departamentos) e deixo a Fase 2 (toggle por assinatura + página de configuração) para entrega seguinte? Ou prefere que prepare também a migration e a página de configuração no mesmo passo?
