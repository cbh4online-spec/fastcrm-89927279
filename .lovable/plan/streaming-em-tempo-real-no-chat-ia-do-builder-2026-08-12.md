# Streaming em tempo real no Chat IA do Builder

Objetivo: ao enviar um pedido no Chat IA, ver o texto/HTML a ser gerado ao vivo (no chat e na antevisão), em vez de esperar pelo bloco final.

## Diagnóstico

Hoje o modo `chat` da função `builder-ai` chama o gateway com `stream: false` e devolve um JSON `{ summary, html }` de uma só vez. O painel usa `supabase.functions.invoke`, que só resolve no fim — daí a espera longa sem feedback (páginas inteiras demoram dezenas de segundos).

Obstáculo: o formato atual é JSON completo, que não é útil parcialmente. Para streaming muda-se o protocolo de resposta do modelo.

## Decisões de produto/UX

- Mensagem do assistente aparece imediatamente com estado "a gerar…" e vai crescendo.
- Enquanto gera, mostra-se: contador de caracteres/linhas recebidos e um resumo curto (primeira linha) assim que chegar.
- Antevisão ao vivo (opcional por toggle "Antevisão ao vivo", ligado por defeito): o canvas mostra o HTML parcial com debounce (~300 ms) e só ao terminar é que a alteração é confirmada no histórico (Undo/Redo).
- Botão **Parar** durante a geração; o que já foi gerado pode ser descartado (por defeito) ou aplicado.
- Se o streaming falhar (rede/proxy), faz fallback automático para o modo atual não-streaming, sem erro visível para o utilizador.
- Reverter, histórico persistente e edição por bloco selecionado mantêm-se exatamente como estão.

## Estrutura técnica

**Edge Function `builder-ai`** (`supabase/functions/builder-ai/index.ts`)
- Novo campo no corpo: `stream?: boolean` (só válido em `mode: "chat"`).
- Quando `stream` é verdadeiro: chamada ao gateway com `stream: true` e resposta devolvida como SSE (`text/event-stream`) para o cliente, reencaminhando os deltas de `choices[0].delta.content`.
- Protocolo de saída em streaming (novo system prompt para chat streaming): o modelo devolve
  1. primeira linha `SUMMARY: <resumo curto>`
  2. de seguida o HTML puro (sem cercas de código, sem JSON).
  Assim cada delta é diretamente utilizável para antevisão.
- Eventos SSE emitidos pela função: `delta` (texto), `done` (`{ summary, html, scope }`), `error` (`{ message }` — inclui 429 e 402 com as mensagens atuais).
- Instrumentação: como o corpo é consumido em streaming, acumula-se o `usage` do último chunk (ou estima-se por tamanho) e chama-se `logAIUsage` no fim, com `workspaceId` — mantendo o registo de consumo.
- Modo não-streaming permanece intacto (usado por refactor, variantes, tradução, criação de asset e fallback).

**Hook `useBuilderAIChat`** (`src/modules/builder/hooks/useBuilderAIChat.ts`)
- Novo `sendStreaming(args, { onDelta })`: usa `fetch` direto ao endpoint da função com o token de sessão (o `invoke` não expõe o corpo em streaming), lê o SSE com `ReadableStream` + `TextDecoder`.
- Suporta `AbortController` para o botão Parar.
- Persistência igual à atual: grava mensagem do utilizador antes e a do assistente no fim (com `summary`, `html_before`, `html_after`); em caso de erro grava mensagem com `is_error`.
- Mantém `send()` atual como fallback.

**Painel `BuilderAIChatPanel`** (`src/modules/builder/components/BuilderAIChatPanel.tsx`)
- Estado local `streamingText`; bolha de assistente "em curso" com cursor a piscar e auto-scroll.
- Toggle "Antevisão ao vivo" + botão Parar.
- Ao concluir: aplica via `onReplaceFullHtml` (página) ou `onPatch` (bloco selecionado), tal como hoje, registando no histórico de Undo.

## Critérios de aceitação

- Ao enviar um pedido, aparece texto a fluir em menos de ~3 s.
- Com "Antevisão ao vivo" ligada, o canvas atualiza-se progressivamente e fica correto no fim.
- Botão Parar interrompe a geração sem partir o editor.
- ⌘Z reverte a alteração aplicada pela IA como uma única operação.
- Erros de créditos (402) e limite (429) continuam a aparecer como aviso claro.
- Conversa continua a ser guardada e retomada após recarregar.

## Riscos e pontos por validar

- HTML parcial durante a antevisão pode renderizar temporariamente "partido" — mitigado com debounce e sanitização já existente.
- Se o modelo ignorar o formato `SUMMARY:`, usa-se o texto completo como HTML e resumo genérico.
- Contabilização de tokens em streaming é menos precisa do que no modo atual.
