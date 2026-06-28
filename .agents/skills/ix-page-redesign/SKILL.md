---
name: ix-page-redesign
description: Refazer uma página do FastCRM no padrão visual InvoiceXpress (IX) — header limpo, abas underline, cartões planos, sem gradientes — mantendo 100% das funcionalidades existentes. Acionar quando o utilizador disser "refazer / rever / adaptar / manter o design e a simplicidade do invoiceexpress" sobre uma página, módulo, listagem ou detalhe.
---

# IX Page Redesign

Padrão consolidado em PHARLISS para uniformizar páginas com o estilo InvoiceXpress: simples, branco, tipografia forte, azul FastCRM como única cor de marca, sem gradientes nem ícones em quadrados coloridos.

## Princípio absoluto

**Não perder nenhuma funcionalidade.** Só muda apresentação (layout, hierarquia, tokens, agrupamento de tabs). Hooks de dados, mutations, RLS, permissões, navegação, modais e regras de negócio ficam intactos. Se uma feature precisa sair, perguntar primeiro.

## Componentes IX a reutilizar (já existem)

- `src/components/entity/ix/IXCard.tsx` — wrapper `rounded-2xl border bg-card p-6`, opcional título + actions.
- `src/components/entity/ix/IXEntityTabs.tsx` — barra de tabs underline com badges de contagem.
- `src/components/entity/ix/IXEntityHeader.tsx` — cabeçalho de duas linhas, CTA primário + dropdown "...".
- `src/components/entity/ix/IXDetailsPanel.tsx` — painel direito de detalhes inline.
- `src/components/documents/listing/` — `DocumentListLayout`, `DocumentFilterChip`, `DocumentListToolbar`, `DocumentSummaryCard`, `DocumentRow`, `DocumentStatusBadge` para listagens.
- `src/components/forms/IXFormLayout.tsx` + `IXField.tsx` para formulários.

Usar sempre estes — não criar variantes paralelas.

## Regras visuais

1. **Header**: título `text-3xl font-bold tracking-tight`, sem gradientes, sem ícones gigantes. Um único CTA primário azul. Restantes ações dentro de um menu `...`.
2. **Pesquisa**: input em pílula `h-12 rounded-full` com lupa à esquerda.
3. **Filtros**: chips `DocumentFilterChip` ou pílulas `rounded-full` com borda. Estado ativo = `border-primary text-primary`.
4. **Tabs**: `IXEntityTabs` (sublinhado), nunca pílulas grandes nem fundos cheios.
5. **Cartões**: `IXCard` (branco, borda fina, `rounded-2xl`, `shadow-sm`). Sem `bg-gradient-*`, sem fundos translúcidos coloridos.
6. **KPIs**: cards planos com label uppercase `text-[11px] tracking-wider text-muted-foreground`, valor `text-2xl font-bold`, ícone num tile neutro `bg-muted` (não colorido). YoY via `DeltaBadge`.
7. **Listas**: linhas compactas `DocumentRow` com divisores, em vez de cartões pesados por item.
8. **Cores**: só tokens semânticos (`text-foreground`, `text-muted-foreground`, `bg-card`, `border-border`, `text-primary`). Proibido `text-white`, `bg-black`, `bg-[#...]`, `from-purple-*`, `via-*`, `to-*`.
9. **Densidade**: muito espaço branco, hierarquia por tipografia e divisores — não por cor.
10. **Estados vazios**: dentro de um `IXCard`, frase curta + CTA discreto, nunca ilustração genérica.

## Tabs em páginas de detalhe (Lead/Contacto/Empresa)

Máximo 5 grupos topo, mantendo todas as secções legadas como sub-tabs:
- Visão Geral · Atividade · Comunicação · Negócio · IA & Dados

IDs antigos de `MenuSection` continuam suportados via mapeamento — não partir `useEntityCounts` nem `workspace_layout_config`.

## Workflow obrigatório

1. **Diagnóstico curto**: identificar o que polui (gradientes, ícones coloridos, cartões aninhados, abas a mais, CTAs duplicados, KPIs decorativos).
2. **Inventário de funcionalidades**: listar tudo o que a página faz hoje (hooks, mutations, modais, ações). Nenhum item pode desaparecer.
3. **Reagrupar, não reescrever**: mover blocos existentes para `IXCard` / `IXEntityTabs`. Reutilizar componentes internos como estão.
4. **Substituir tokens proibidos** por semânticos.
5. **Validar com Playwright** na rota afetada: header limpo, tabs funcionais, consola sem erros, responsivo md↔lg, todas as ações ainda acessíveis.
6. **Confirmar critérios de aceitação** abaixo antes de fechar.

## Critérios de aceitação

- Um único CTA primário no header; restantes ações em `...`.
- Zero gradientes, zero ícones em quadrados coloridos, zero `bg-[#...]`.
- Todas as funcionalidades pré-existentes continuam acessíveis e funcionais.
- Preferências persistidas (`workspace_layout_config`, colunas dinâmicas) continuam a funcionar.
- Consola limpa, sem regressões em hooks de dados.
- Layout coerente com Faturas / Propostas / Renovações / Prospeção / Lead Enricher / FastMatch / Google Local / Sales Performance já refeitos.

## Anti-padrões (rejeitar imediatamente)

- Criar novos componentes "Premium*", "Hero*", "Fancy*" em vez de usar `IXCard`.
- Repor gradientes "só no header".
- Reduzir tabs eliminando funcionalidades em vez de agrupar.
- Trocar tabelas operacionais por cartões decorativos que escondem dados.
- Hardcode de cores fora dos tokens.

## Referência de páginas já migradas

Faturas, Propostas, Encomendas, Notas de Encomenda, Renovações, Prospeção (+Analytics), Lead Enricher, FastMatch (+Analytics, PendingInterests), Google Local Services, Sales Performance Dashboard, Leads/Contactos/Empresas (listagens IX), Lead Detail (5 tabs), Visão Global do Dashboard, Perfil. Usar qualquer uma como referência viva ao redesenhar a próxima.
