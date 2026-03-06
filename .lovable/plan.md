

# Command Center — Núcleo Operacional Real

## Diagnóstico

Após análise exaustiva do código, o sistema **já tem ~85% implementado**:

- **Intent Router**: keyword (25+ mappings) + LLM fallback com tool calling — funciona
- **Data Engine**: 20+ handlers com queries reais (`deal_intelligence_cache`, `opportunities`, `leads`, `kernel_decisions`, `context_drift`, `revenue_forecasts`, etc.)
- **Response Builder**: `buildResponse` com contrato estrito (headline, subtext, items, actions, metric)
- **Quick Actions no chat**: items clicáveis + botões de ação (bulk_task, navigate, create_saved_view, etc.)
- **Conversation Memory**: `conversationContextRef` com last_question, last_dataset, last_analysis
- **Kernel Events**: 3 eventos emitidos por interação (INTENT_DETECTED, ACTION_EXECUTED, RESPONSE_GENERATED)
- **Telemetria**: `execution_time_ms`, `is_fallback`, `ask_fastcrm_query_logs`
- **PipelineRiskCard**: já usa `deal_intelligence_cache` (mesma fonte que o chat)

## Problemas Reais Identificados

### 1. Auth quebrada no Edge Function
A edge function usa `userClient.auth.getClaims()` que **não existe** no SDK do Supabase. Isto pode causar erros 401 em todas as chamadas.

### 2. Slash commands retornam texto plano
`/forecast`, `/leads`, `/pipeline`, `/drift` chamam `ask-fastcrm` mas descartam `items` e `actions` do resultado — mostram apenas o headline como texto. O utilizador não consegue agir a partir de um slash command.

### 3. Slash commands em falta
Faltam: `/risk`, `/stalled`, `/priorities`. Estão no spec mas não existem em `SLASH_COMMANDS`.

### 4. Respostas em inglês
Vários handlers devolvem texto em inglês: "Untitled Deal", "Follow up on at-risk deal", pipeline comparison inteiro em inglês, suggestion texts.

### 5. `/tarefas` e `/kernel` navegam para fora
Em vez de mostrar dados inline, estes comandos fazem `navigate()` e mostram `null` — quebram o fluxo conversacional.

### 6. Slash commands não passam resultado estruturado ao chat
Quando `/pipeline` devolve resultado, o `AIQuestionBox` apenas mostra o `content` string — ignora `data` que contém items e actions.

## Plano de Implementação

### Fase 1: Corrigir Auth + Slash Commands Estruturados

**`supabase/functions/ask-fastcrm/index.ts`**
- Substituir `getClaims()` por `getUser()` — método validado do SDK
- Traduzir todas as strings em inglês para português

**`src/hooks/useSlashCommands.ts`**
- Adicionar 3 novos comandos: `/risk`, `/stalled`, `/priorities`
- Para `/forecast`, `/leads`, `/pipeline`, `/drift`, `/risk`, `/stalled`, `/priorities`, `/tarefas`, `/kernel`: devolver o resultado completo de `ask-fastcrm` (incluindo items e actions) em vez de apenas texto
- Mudar `/tarefas` e `/kernel` para chamar `ask-fastcrm` inline em vez de `navigate()`

**`src/components/command-center/AIQuestionBox.tsx`**
- Quando `slashResult` chega com `data` que contém `items`/`actions`, injectar esses dados na mensagem do chat para renderizar items clicáveis e quick actions (exactamente como já acontece para perguntas naturais)

### Fase 2: Consistência de Respostas

**`supabase/functions/ask-fastcrm/index.ts`**
- `queryPipelineComparison`: traduzir todas as strings para PT-PT
- `queryDealsAtRisk`: mudar "Untitled Deal" → "Deal sem nome", suggestion text para PT
- `queryDealsStuckInStage`: traduzir subtitles
- `queryForecastRisk`: traduzir labels
- Cada handler com 0 items deve incluir diagnóstico contextual (ex: "Não existem deals com close date definida" em vez de apenas "Nenhum deal encontrado")

### Fase 3: Robustez de Fallbacks

**`supabase/functions/ask-fastcrm/index.ts`**
- No `default` case de `executeIntent`: já foi melhorado mas melhorar a mensagem com contagem de dados disponíveis (ex: "Tens X deals e Y leads — tenta 'como está o pipeline?' ou 'leads sem resposta'")
- Quando LLM falha: manter keyword result mesmo com confidence < 0.75 se > 0.50 (actualmente descarta e vai para LLM)

## Ficheiros Afectados

| Ficheiro | Alteração |
|----------|-----------|
| `supabase/functions/ask-fastcrm/index.ts` | Fix auth, traduzir strings EN→PT, melhorar fallbacks |
| `src/hooks/useSlashCommands.ts` | +3 comandos, devolver resultado estruturado |
| `src/components/command-center/AIQuestionBox.tsx` | Renderizar items/actions de slash commands no chat |

Sem migrações de base de dados necessárias. Todas as tabelas e hooks já existem.

