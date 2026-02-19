
# Diagnóstico: Cron de Sincronização a Falhar Silenciosamente

## Causa Raiz

O cron `cron-sync-messages` **está a correr** (cada minuto, via pg_cron), mas **não está a descarregar nenhuma mensagem**. Os logs confirmam:

```
[Cron Sync] Iteration time limit reached, stopping workspaces
```

Este log aparece sempre na **Iteração 1**, o que significa que o sistema pára antes de processar qualquer workspace.

### O que acontece passo a passo:

1. O cron arranca e chama `syncAllWorkspaces()`
2. A função tenta fazer `fetch` ao GHL: `services.leadconnectorhq.com/conversations/search`
3. A API do GHL demora **mais de 4 segundos** a responder (latência normal para APIs externas)
4. O guard `if (Date.now() - iterationStart > 4000)` dispara **antes** de qualquer resposta chegar
5. O loop de workspaces quebra com `break`
6. **Resultado: zero conversas verificadas, zero mensagens descarregadas**

### Problema secundário: ausência de timeout no fetch

Não há `AbortController` nas chamadas ao GHL — se a API não responder, a função bloqueia indefinidamente até ao timeout do edge function (60s), desperdiçando todas as iterações.

---

## Solução

### 1. Aumentar o guard de tempo por workspace: 4s → 20s

O guard atual é demasiado restritivo. Uma chamada API + parsing de dados precisa de pelo menos 10-15s. Com 3 workspaces, 20s por workspace é razoável dentro do ciclo de 60s.

```ts
// Antes
if (Date.now() - iterationStart > 4000) break;

// Depois
if (Date.now() - iterationStart > 20000) break;
```

### 2. Adicionar `AbortController` com timeout de 15s nas chamadas ao GHL

Evita que uma chamada lenta bloqueie o processo indefinidamente:

```ts
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 15000);

const ghlResponse = await fetch(ghlUrl, {
  signal: controller.signal,
  headers: { ... }
});
clearTimeout(timeoutId);
```

### 3. Simplificar a arquitectura de iterações

A lógica actual de "12 iterações × 5s" foi desenhada para polling frequente, mas está a conflituar com o tempo de resposta do GHL. Simplificar para **1 iteração sólida por minuto** (que é o que o pg_cron já garante):

- Remover o loop de 12 iterações
- Fazer uma única passagem robusta por todos os workspaces, com timeout adequado
- O cron de 1 em 1 minuto trata da frequência

### 4. Melhorar logs de diagnóstico

Adicionar logs antes e depois de cada chamada ao GHL para facilitar debugging futuro:

```ts
console.log("[Cron Sync] Calling GHL API for workspace", workspace_id);
// ... fetch ...
console.log("[Cron Sync] GHL response received", { status, conversations: count });
```

---

## Ficheiros a alterar

| Ficheiro | Acção |
|---|---|
| `supabase/functions/cron-sync-messages/index.ts` | Corrigir guard de tempo, adicionar AbortController, simplificar iterações, melhorar logs |

## Technical Details

- O pg_cron já dispara a função 1x por minuto — não é necessário replicar esse comportamento internamente com 12 iterações.
- A janela de tempo para "mensagens recentes" mantém-se em 30 minutos (garante continuidade mesmo que uma iteração falhe).
- A lógica de deduplicação por `ghl_message_id` / `external_message_id` mantém-se intacta — não há risco de duplicados mesmo se o cron correr mais vezes.
- O `AbortController` com 15s de timeout por chamada GHL garante que mesmo com API lenta, o processo não fica bloqueado.
- Com 3 workspaces activos e 15s de timeout por API call, a função completa em menos de 60s no pior caso.
