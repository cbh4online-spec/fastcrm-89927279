
# Melhorar Responsividade Mobile e Elementos Visuais dos Funis

## Problemas identificados

### Responsividade Mobile

1. **FunnelsList.tsx** — Cabeçalho com 3 botões (`Nova Vertical`, `Novo Template AIDA`, `Novo Funil`) numa linha horizontal não cabe em mobile. Precisam de colapsar num menu dropdown ou adaptar para 2 linhas.

2. **FunnelStepsTab.tsx** — Layout `flex gap-6` com sidebar de `w-72` fixo ao lado do conteúdo principal. Em mobile, fica completamente espremido. Precisa de mudar para layout vertical com tabs ou acordeão.

3. **FunnelStepEditor.tsx** — Grid de `grid-cols-2` (editor + preview) lado a lado. Em mobile, as colunas ficam demasiado estreitas.

4. **FunnelStatsTab.tsx** — Tabela com 11 colunas não cabe em mobile. Precisa de scroll horizontal ou vista alternativa.

5. **FunnelBuilder.tsx** — `TabsList` com 7 tabs (`Steps`, `Stats`, `Sales`, `Products`, `Events`, `Settings`, `AI Insights`) numa linha, estoura fora do ecrã em mobile.

6. **VerticalFunnelManager.tsx** — `TabsList` com 5 tabs com ícones e texto, mesmo problema.

7. **VerticalView.tsx** e **FunnelsList** — Cabeçalhos com `flex items-center justify-between` que colapsam mal em mobile.

### Elementos Visuais em Falta

1. **FunnelsList** — Cartões das verticais e templates sem indicadores visuais de performance (conversão rate, barra de progresso visual).

2. **FunnelsList** — Estado vazio "Sem funis" apenas com ícone Globe e texto simples, sem apelo visual.

3. **FunnelStepsTab** — Preview dos steps com placeholder cinzento básico (`w-48 h-64 border rounded-lg bg-muted/30`), sem qualquer detalhe visual.

4. **Funis sem vertical** — Cartões sem preview do tipo de funil, sem indicador de steps configurados.

## Solução

### Ficheiros a alterar

| Ficheiro | Alterações |
|----------|------------|
| `FunnelsList.tsx` | Botões em mobile como dropdown; melhorar cartões com stats visuais; empty state mais apelativo |
| `FunnelBuilder.tsx` | TabsList scrollável com `overflow-x-auto` em mobile; esconder texto das tabs em mobile |
| `VerticalFunnelManager.tsx` | TabsList scrollável; esconder texto em mobile |
| `FunnelStepsTab.tsx` | Layout adaptado: em mobile mostra lista de steps primeiro, ao selecionar abre editor em full-width |
| `FunnelStepEditor.tsx` | `grid-cols-1 md:grid-cols-2` para preview por baixo em mobile |
| `FunnelStatsTab.tsx` | Wrapper com `overflow-x-auto` para scroll horizontal da tabela em mobile |
| `VerticalView.tsx` | Cabeçalho adaptado para mobile |

### Detalhes das melhorias visuais

**FunnelsList:**
- Botões de acção no cabeçalho: em mobile (< md), substituir os 3 botões por um botão `+` e um dropdown com as opções
- Cartões de Templates AIDA: adicionar barra de conversão colorida no topo do cartão
- Empty state: ilustração mais apelativa com gradiente de fundo, ícone maior, call-to-action com destaque

**FunnelBuilder tabs:**
- `TabsList` com `flex-nowrap overflow-x-auto` e sem padding para caber em mobile
- Em ecrãs pequenos, esconder o texto das tabs e mostrar só ícones (usar `hidden sm:inline` no texto)

**FunnelStepsTab:**
- Em mobile: lista de steps ocupa toda a largura; ao clicar num step, a lista "desliza" para cima e o editor abre abaixo (stack vertical via `flex-col` em `< md`)

**FunnelStatsTab:**
- Envolver a `Card` + `Table` num `div` com `overflow-x-auto` para scroll horizontal em mobile
- Adicionar no topo 3 KPI cards com totais agregados (total views, total opt-ins, total vendas) antes da tabela

**Cartões de Funis (FunnelsList e VerticalView):**
- Adicionar indicador colorido no lado esquerdo do cartão (stripe vertical) com a cor do tipo de funil
- Mostrar número de steps configurados com um ícone
