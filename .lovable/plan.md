

# Correcção: IA Conversacional sem Contexto e Routing Errado

## Problemas Identificados

1. **`/brief` chama `ask-fastcrm` em vez de `strategic-intelligence-brief`** — O comando `/brief` não existe no array `SLASH_COMMANDS`, então passa pelo `handleSubmit` normal e vai para `ask-fastcrm`.
2. **Sem histórico de conversa** — `useAskFastCRM.ask()` envia apenas `{ question }` sem `conversation_history`, logo cada mensagem é isolada.
3. **Resposta do `/brief` renderizada como texto plano** — Não há formatação estruturada para briefs.
4. **Follow-ups sem contexto** — "mas o que posso fazer" não sabe que a conversa anterior falou de previsão €0.
5. **"melhor cliente" confundido com deals** — `ask-fastcrm` não recebe dados CRM de contactos/empresas.

## Plano de Implementação

### 1. Routing correcto de slash commands

**Ficheiros:** `src/hooks/useSlashCommands.ts`, `src/components/command-center/AIQuestionBox.tsx`

- Adicionar `/brief`, `/forecast`, `/leads`, `/pipeline`, `/drift`, `/tarefas`, `/kernel` ao array `SLASH_COMMANDS`
- `/brief` → invocar directamente `strategic-intelligence-brief` com `workspace_id`
- `/forecast` → invocar `compute-revenue-forecast`
- Os restantes (`/leads`, `/pipeline`, `/drift`, `/tarefas`, `/kernel`) → enviar query estruturada para `ask-fastcrm`
- Renderizar resposta do `/brief` como card estruturado (summary, métricas, acções) dentro do chat thread

### 2. Enviar conversation_history em cada chamada

**Ficheiros:** `src/hooks/useAskFastCRM.ts`, `src/components/command-center/AIQuestionBox.tsx`, `supabase/functions/ask-fastcrm/index.ts`

- Alterar `useAskFastCRM.ask()` para aceitar um segundo parâmetro `conversationHistory: {role, content}[]`
- No `AIQuestionBox.handleSubmit`, passar o array `messages` actual ao chamar `ask(query, history)`
- Limitar histórico a 20 mensagens (últimas 10 trocas)
- Na edge function `ask-fastcrm`, receber `conversation_history` do body e injectá-lo no prompt do LLM para manter contexto

### 3. Follow-ups contextuais automáticos

**Ficheiros:** `src/components/command-center/AIQuestionBox.tsx`

- Após cada resposta da IA, gerar chips de sugestão contextual baseados no conteúdo:
  - Resposta com €0 / confiança baixa → "O que posso fazer para melhorar?", "Como está o pipeline?"
  - Resposta sobre leads → "Qual tem maior potencial?", "Ver todos os leads"
  - Resposta sobre deals/pipeline → "Quais estão em risco?", "Como acelerar o fecho?"
  - Default → "Explica mais", "O que devo fazer?"

### 4. Contexto CRM no payload

**Ficheiros:** `src/hooks/useAskFastCRM.ts`

- Antes de chamar `ask-fastcrm`, fazer queries leves para obter:
  - Top 5 contactos por actividade recente
  - Top 5 empresas por valor de deals
  - Contagem de leads activos
- Incluir como `crm_summary` no body do request
- Na edge function, incluir este resumo no prompt LLM para responder a perguntas como "melhor cliente"

### 5. Renderização estruturada do /brief

**Ficheiros:** `src/components/command-center/AIQuestionBox.tsx` (ou novo componente `BriefCard`)

- Quando a resposta vem de `strategic-intelligence-brief`, renderizar um card com:
  - Header "📋 Brief Executivo" + data
  - Resumo executivo (markdown)
  - Link "Ler brief completo →" para `/dashboard/strategic-brief`

### Ordem de implementação

1. Routing de slash commands (resolve problema mais visível)
2. Conversation history (resolve follow-ups sem contexto)  
3. Sugestões contextuais (melhoria de UX)
4. CRM context no payload (melhoria de qualidade)
5. Brief card estruturado (polimento visual)

