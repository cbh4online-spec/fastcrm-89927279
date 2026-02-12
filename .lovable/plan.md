
## Corrigir Autopilot: Erro "type must be a valid enum value" e Canal Incorreto

### Problema

Os logs mostram que o autopilot esta a gerar respostas IA corretamente, mas falha ao enviar porque:

1. Conversas do tipo `TYPE_PHONE` / `TYPE_CALL` do GHL estao a ser mapeadas para o canal `"phone"` -- que nao existe como tipo de mensagem valido na API do GHL
2. A funcao `mapChannelToGHLType` nao tem mapeamento para `"phone"`, resultando em `type: "PHONE"` -- que a API GHL rejeita com `"type must be a valid enum value"`
3. O autopilot esta a disparar para TODAS as conversas sincronizadas (incluindo conversas antigas), gerando spam desnecessario

Os tipos validos da API GHL sao: `SMS`, `Email`, `WhatsApp`, `IG`, `FB`, `Custom`, `Live_Chat`, `InternalComment`

### Solucao

**Ficheiro 1: `supabase/functions/ghl-sync-conversations/index.ts`**

Corrigir o mapeamento de `TYPE_PHONE` e `TYPE_CALL` de `"phone"` para `"sms"` (chamadas telefonicas nao podem ser respondidas por mensagem, SMS e o fallback correto):

```text
"TYPE_PHONE": "sms",    // era "phone"
"TYPE_CALL": "sms",     // era "phone"
```

Adicionar filtro de data para o autopilot trigger -- so acionar para mensagens recentes (ultimas 2 horas), evitando responder a conversas antigas durante o batch sync.

**Ficheiro 2: `supabase/functions/ghl-send-message/index.ts`**

Adicionar mapeamento de seguranca para `"phone"` e `"call"` na funcao `mapChannelToGHLType`:

```text
"phone": "SMS",
"call": "SMS",
"other": "SMS",
```

**Ficheiro 3: `supabase/functions/ghl-webhook-message/index.ts`**

Aplicar a mesma correcao no mapeamento de `TYPE_PHONE` / `TYPE_CALL` de `"phone"` para `"sms"` na funcao `resolveGHLChannel`, e adicionar `"phone"` e `"call"` ao `mapGHLChannel`:

```text
"phone": "sms",
"call": "sms",
```

### Detalhes Tecnicos

Alteracoes especificas:

1. **`ghl-sync-conversations/index.ts`** (linhas 205-206): Mudar `"phone"` para `"sms"` nos mapeamentos `TYPE_PHONE` e `TYPE_CALL`
2. **`ghl-sync-conversations/index.ts`** (linhas ~674-691): Adicionar validacao de data antes de acionar autopilot -- verificar se `lastMessageDate` e recente (< 2 horas)
3. **`ghl-send-message/index.ts`** (linhas 484-497): Adicionar `"phone": "SMS"`, `"call": "SMS"`, `"other": "SMS"` ao `mapChannelToGHLType`
4. **`ghl-webhook-message/index.ts`** (linhas ~570-585): Mudar `TYPE_PHONE` e `TYPE_CALL` para `"sms"` e adicionar fallbacks no `mapGHLChannel`

### Resultado Esperado

- Conversas de chamadas/telefone serao tratadas como SMS (canal valido para envio)
- O autopilot so respondera a mensagens recentes, nao a historico antigo
- O erro "type must be a valid enum value" sera eliminado
- Respostas automaticas serao enviadas com sucesso via GHL
