## Diagnóstico

A página atual `LeadDetailWithSidebar` já recebeu um primeiro polimento IX no cabeçalho (avatar, título grande, pílulas), mas no print persistem fricções visuais e funcionais:

- **Ruído no topo**: o cabeçalho mistura breadcrumb, botão voltar, avatar, título, 2 badges (origem + status), tags inline, "atualizado há", ícones sociais E 5 botões de ação. Tudo na mesma linha. InvoiceXpress mantém **uma única linha de título + um CTA primário** e empurra o resto para menus/contexto.
- **Hierarquia confusa**: existem 3 zonas competindo — `EntityHorizontalTabs` (9+ tabs: Visão Geral, Insights IA, Timeline, Notas, Comunicação, Atividade, Equipa, Ficheiros, Negócios, Dados), conteúdo central, e `EntityDetailsPanel` direito. O utilizador não sabe onde focar.
- **Tabs excessivas**: 10 secções topo + sub-tabs internas (Comunicação tem 3, Atividade 2, Negócios 3, Dados 3). Total ~20 vistas. IX limita-se tipicamente a 4-6 separadores claros.
- **Densidade visual**: cores fortes nos badges de status (azul/âmbar/verde com fundo translúcido) e cartões internos (ex.: `TagsSection` ainda tem `bg-gradient-to-br`, `bg-gradient-to-r from-purple-500/10`, ícone em quadrado colorido) — destoam do branco/cinza-leve IX.
- **Panel direito "Detalhes"** mostra campos vazios com travessão (`—`) em vez de chamada à acção para preencher (Email, Telefone, Fonte: ghl, Empresa, Website, Redes Sociais). Pouco útil.
- **Funcionalidades que NÃO podem desaparecer**: enriquecimento IA / Analisar IA, Converter Lead, eliminar, scores, lifecycle, audit log, custom fields, timeline, notas, emails, mensagens, agendamentos, tarefas, automações, oportunidades, propostas, crédito, ficheiros, equipa, agente IA & memória, recomendações, social analysis, Instagram data.

## Decisões de produto/UX

1. **Cabeçalho IX puro em duas linhas**
   - Linha 1: ← voltar · avatar · nome grande (`text-3xl`) · pílula de status única
   - Linha 2: linha fina com `Empresa · Origem · Tags · Atualizado há X` (texto cinza, separadores `·`)
   - À direita: **um único CTA primário "Converter"** + menu "..." com Analisar IA, Enviar email, Eliminar e ações secundárias. Ícones sociais movem-se para o painel direito.
2. **Reduzir tabs para 5**:
   - **Visão Geral** (overview + highlights + scores + lifecycle + recomendações)
   - **Atividade** (Timeline + Notas + Tarefas + Automações em sub-tabs leves)
   - **Comunicação** (Emails + Mensagens + Agendamentos)
   - **Negócio** (Oportunidades + Propostas + Crédito + Ficheiros)
   - **IA & Dados** (Insights IA + Agente + Social Analysis + Instagram + Custom Fields + Auditoria)
   - Mantém todos os componentes existentes — só muda o agrupamento.
3. **Painel direito redesenhado**: card branco único "Detalhes" com campos editáveis inline. Quando vazio mostra "+ adicionar email" em vez de `—`. Secção colapsável "Redes sociais" só aparece se houver links.
4. **Conteúdo central**: fundo branco (em vez do cinza atual `bg-muted/20`), cartões internos `border + rounded-2xl + shadow-sm`, sem gradientes, sem ícones em quadrados coloridos. Aplicar a `TagsSection`, `LeadScoresCard`, `LeadLifecycleSection`, `NotesSection`, etc.
5. **Manter 100% das funcionalidades**: nenhum componente é removido, apenas reorganizado. Os IDs de `MenuSection` antigos continuam suportados via mapeamento para não partir `useEntityCounts`, `workspace_layout_config` e preferências persistidas.

## Estrutura técnica

### Novos componentes partilhados
- `src/components/entity/ix/IXEntityHeader.tsx` — cabeçalho de duas linhas, CTA + dropdown de acções.
- `src/components/entity/ix/IXEntityTabs.tsx` — barra de 5 tabs underline simples (sem `EntityHorizontalTabs` pesado).
- `src/components/entity/ix/IXDetailsPanel.tsx` — substitui visualmente `EntityDetailsPanel` (reaproveita o mesmo hook de update inline).
- `src/components/entity/ix/IXCard.tsx` — wrapper `rounded-2xl border bg-card p-6` para uniformizar secções internas.

### Ajustes em secções existentes (apenas visual)
- `TagsSection`, `LeadScoresCard`, `LeadLifecycleSection`, `LeadAuditSection`, `NotesSection`: trocar gradientes/ícones coloridos por `IXCard` + cabeçalho simples.

### Página
- `LeadDetailWithSidebar.tsx` reorganiza-se em torno de `IXEntityHeader`, `IXEntityTabs` e mapeamento `activeSection -> grupo`. O `renderSectionContent` passa a ler de um dicionário `IX_TAB_GROUPS`.

### Persistência
- `MenuSection` legados (`overview`, `insights`, `timeline`, `notes`, `communication`, `activity`, `team`, `business`, `files`, `data`) continuam válidos — apenas são agrupados na UI. `useEntityCounts` não muda.

### Não toca
- Hooks de dados (`useLead`, `useUpdateLead`, `useEntityCounts`).
- Lógica de conversão, IA, audit, RLS.
- Rotas.

## Plano de implementação

1. Criar `IXCard`, `IXEntityHeader`, `IXEntityTabs`, `IXDetailsPanel`.
2. Refactor `LeadDetailWithSidebar.tsx` para usar os novos componentes e o agrupamento de 5 tabs (com mapeamento dos IDs antigos).
3. Polir visualmente `TagsSection`, `LeadScoresCard`, `LeadLifecycleSection`, `LeadAuditSection` removendo gradientes.
4. Verificar com Playwright em `/dashboard/leads/:id` (header, tabs, painel direito, sem regressões nos painéis internos) e validar consola limpa.
5. Não replicar ainda para Contactos/Empresas — primeiro validar o padrão na Lead. Posteriormente extrair para `EntityDetailIX` partilhado.

## Critérios de aceitação

- Cabeçalho com um único CTA primário "Converter" e menu "..." para ações secundárias.
- Máximo 5 tabs topo, todas as funcionalidades atuais acessíveis em sub-tabs.
- Painel direito limpo, CTAs para preencher campos vazios (em vez de `—`).
- Sem gradientes nem ícones em quadrados coloridos no conteúdo.
- Mesmo fluxo de Conversão, IA, eliminar, scores, audit, custom fields.
- Sem erros de consola; responsivo md ↔ lg.
- Preferências de layout previamente guardadas continuam a funcionar.

## Riscos e pontos por validar

- `EntityHorizontalTabs` é partilhado com Contactos/Empresas — vou manter o ficheiro e criar `IXEntityTabs` em paralelo, sem partir os outros detalhes.
- `EntityDetailsPanel` também é partilhado; substituição visual fica encapsulada num wrapper IX só usado pela Lead nesta fase.
- `workspace_layout_config` pode esconder tabs por config; o mapeamento de 5 grupos respeita a visibilidade individual de cada `MenuSection`.

Confirmas o agrupamento das 5 tabs (Visão Geral · Atividade · Comunicação · Negócio · IA & Dados) antes de avançar?
