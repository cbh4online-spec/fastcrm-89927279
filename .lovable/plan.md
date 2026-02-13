

# P2-6: Modo Dry Run para Fluxos Conversacionais

## Contexto

Atualmente nao existe forma de testar um fluxo antes de o ativar. O utilizador tem de ativar o flow e enviar mensagens reais para ver se a logica funciona. Um modo "dry run" permite simular a execucao localmente no browser, sem criar sessoes nem gravar dados na base de dados.

## O que sera implementado

### 1. Motor de simulacao local

Novo ficheiro `src/lib/flow-simulator.ts` que replica a logica do `flow-engine` no frontend:
- Recebe os `steps` e `variables` do flow atual (ja carregados no canvas)
- Mantém estado em memória: `currentStepId`, `variables`, `responses[]`
- Processa cada step da mesma forma que o edge function (message, question, condition, action, goal, handoff)
- Para steps do tipo `question`, aguarda input do utilizador antes de avancar
- Avalia condicoes usando a mesma logica (`equals`, `contains`, `greater_than`, etc.)
- Nao faz nenhuma chamada a base de dados nem edge functions

### 2. Componente `FlowDryRunPanel`

Novo componente `src/components/flow-builder/FlowDryRunPanel.tsx` com interface de chat simulado:
- Painel lateral que abre por cima ou ao lado do canvas
- Interface de chat com bolhas de mensagem (bot vs user)
- Input de texto para responder a perguntas do flow
- Indicador visual do step atual (nome + tipo)
- Painel lateral com variaveis recolhidas em tempo real
- Botoes: "Reiniciar", "Fechar"
- Destaque visual no canvas do node ativo durante a simulacao (highlight do step atual)

### 3. Integracao no FlowBuilderCanvas

- Adicionar botao "Testar" (icone Play + tube) no painel top-right do canvas, ao lado de Ativar/Guardar
- Ao clicar, abre o `FlowDryRunPanel` como overlay/drawer
- O step ativo no simulador e destacado no canvas via `selectedStep`

## Plano Tecnico

| Ficheiro | Alteracao |
|---|---|
| `src/lib/flow-simulator.ts` | **Novo** - Motor de simulacao puro (sem I/O) |
| `src/components/flow-builder/FlowDryRunPanel.tsx` | **Novo** - UI de chat simulado |
| `src/components/flow-builder/FlowBuilderCanvas.tsx` | **Editar** - Adicionar botao "Testar" e estado de simulacao |

### Motor de simulacao (`flow-simulator.ts`)

```text
class FlowSimulator {
  steps: FlowStep[]
  variables: FlowVariable[]
  currentStepId: string | null
  collectedVars: Record<string, unknown>
  responses: Array<{ role: 'bot' | 'user', content: string }>
  status: 'idle' | 'waiting_input' | 'completed' | 'handed_off'

  start(): SimResult        // Inicia no entry point, processa ate parar
  sendMessage(msg): SimResult  // Envia resposta do user, avanca flow
  reset(): void             // Reinicia simulacao
}
```

A logica de `processStep` e `evaluateCondition` e extraida do edge function:
- `message` -> adiciona resposta bot, avanca para next_step_id
- `question` -> adiciona pergunta bot, muda status para `waiting_input`
- `condition` -> avalia e segue true/false branch
- `action` -> log simulado, avanca
- `goal` -> marca completo
- `handoff` -> marca handed_off

### FlowDryRunPanel

- Layout tipo chat messenger com scroll automatico
- Bolhas azuis (bot) e cinzentas (user)
- Badge com nome/tipo do step atual
- Painel colapsavel com variaveis recolhidas (key: value)
- Input desabilitado quando flow completo ou em handoff
- Mensagem final de resumo ("Flow completado - X variaveis recolhidas")

### Alteracao no FlowBuilderCanvas

- Novo estado `isDryRunning: boolean`
- Botao "Testar" na Panel top-right (apenas visivel quando ha steps e entry point)
- Quando ativo, passa o `currentStepId` do simulador como prop de highlight para os nodes
- O `FlowDryRunPanel` recebe `steps`, `variables` e callbacks

## Sem alteracoes de DB

Toda a simulacao corre no frontend. Nao e necessaria nenhuma migracao, edge function, ou RLS.

