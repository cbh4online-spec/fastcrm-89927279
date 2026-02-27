

# Fundir AI Copilot e Ask FastCRM numa unica marca

## Problema

Existem duas "marcas" de AI separadas no sistema:
- **"AI Copilot"** / **"Assistente AI"** -- usado na Inbox e mensagens para sugerir respostas, classificar intencoes, etc.
- **"Ask FastCRM"** -- usado como interface de query para pipeline e receita

Na realidade sao partes do mesmo motor de inteligencia e devem aparecer ao utilizador como uma so funcionalidade.

## Diagnostico

| Componente | Estado | Accao |
|---|---|---|
| `src/components/copilot/InboxCopilot.tsx` | Orfao (nao e importado em nenhum lado) | Apagar |
| `src/components/copilot/CrmCopilot.tsx` | Orfao (nao e importado em nenhum lado) | Apagar |
| `src/components/inbox/InboxAIAssistant.tsx` | Activo -- mostra "Assistente AI" | Rebrandar para "Ask FastCRM" |
| `src/components/inbox/InboxTemplateAIDraft.tsx` | Activo -- usa useCopilot | Manter (sem branding visivel) |
| `src/components/messages/ContactMessagesSection.tsx` | Activo -- usa useCopilot | Manter (sem branding visivel) |
| `src/hooks/useCopilot.ts` | Activo -- hook central | Renomear para `useAskAI` |

## Alteracoes

### 1. Apagar componentes orfaos
- Eliminar `src/components/copilot/InboxCopilot.tsx`
- Eliminar `src/components/copilot/CrmCopilot.tsx`
- Eliminar directoria `src/components/copilot/` (ficara vazia)

### 2. Renomear hook `useCopilot` para `useAskAI`
- Renomear `src/hooks/useCopilot.ts` para `src/hooks/useAskAI.ts`
- Exportar a mesma funcao como `useAskAI` (manter `useCopilot` como re-export para compatibilidade)
- Actualizar imports em:
  - `src/components/inbox/InboxAIAssistant.tsx`
  - `src/components/inbox/InboxTemplateAIDraft.tsx`
  - `src/components/messages/ContactMessagesSection.tsx`

### 3. Rebrandar InboxAIAssistant
No ficheiro `src/components/inbox/InboxAIAssistant.tsx`:
- Mudar titulo de **"Assistente AI"** para **"Ask FastCRM"**
- Manter icone Sparkles e toda a funcionalidade igual

### 4. Ficheiros afectados

| Ficheiro | Accao |
|---|---|
| `src/components/copilot/InboxCopilot.tsx` | Apagar |
| `src/components/copilot/CrmCopilot.tsx` | Apagar |
| `src/hooks/useCopilot.ts` | Renomear para `useAskAI.ts`, manter re-export |
| `src/components/inbox/InboxAIAssistant.tsx` | Actualizar import + rebrandar titulo |
| `src/components/inbox/InboxTemplateAIDraft.tsx` | Actualizar import |
| `src/components/messages/ContactMessagesSection.tsx` | Actualizar import |

A edge function `ai-copilot` no backend mantem-se inalterada -- apenas o codigo frontend e unificado sob a marca "Ask FastCRM".

