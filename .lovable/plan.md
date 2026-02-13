

## Fix: Autopilot Nao Ve Mensagens Recentes (Causa Raiz Real)

### Problema Identificado

O autopilot esta a pesquisar a Knowledge Base com a mensagem errada. Em vez de procurar "Tem modulo de proposta?" (a pergunta real), procura "Vamos testar de novo" (uma mensagem antiga).

**Causa raiz**: A conversa tem **43 mensagens** mas o webhook so busca as **primeiras 20** (ORDER BY sent_at ASC LIMIT 20). As mensagens recentes, incluindo "Tem modulo de proposta?", ficam de fora. A IA trabalha com contexto completamente desatualizado.

### Correcao

**Ficheiro**: `supabase/functions/ghl-webhook-message/index.ts` (linha ~896-901)

Alterar a query de mensagens para buscar as **ultimas 20** em vez das **primeiras 20**:

```
// ANTES (busca as 20 mais antigas):
.order("sent_at", { ascending: true })
.limit(20);

// DEPOIS (busca as 20 mais recentes, depois inverte):
.order("sent_at", { ascending: false })
.limit(20);

// E depois inverter para manter a ordem cronologica:
const orderedMessages = (messages || []).reverse();
```

Isto garante que a IA sempre tem as mensagens mais recentes, incluindo a pergunta atual do cliente.

### Detalhe Tecnico

| Ficheiro | Alteracao |
|----------|-----------|
| `supabase/functions/ghl-webhook-message/index.ts` | Inverter ordem de fetch: buscar ultimas 20 mensagens (DESC + reverse) em vez das primeiras 20 (ASC) |

### Resultado Esperado

1. A query busca as 20 mensagens mais recentes (em vez das 20 mais antigas)
2. A ultima inbound "Tem modulo de proposta?" e correctamente identificada
3. A pesquisa KB extrai keywords "modulo" e "proposta"
4. Encontra a entrada "Quais sao os modulos core do FastCRM?" (que menciona Propostas)
5. A IA responde com informacao concreta sobre o modulo de propostas e guia para o proximo passo comercial
