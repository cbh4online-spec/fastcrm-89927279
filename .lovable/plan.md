
# Corrigir classificacao de canal: conversas do Instagram a aparecer como SMS

## Problema raiz

A API do GHL retorna `type: 1` (SMS) ao nivel da conversa, mesmo para conversas que sao de Instagram. O campo `lastMessageType` tambem nem sempre reflete o canal correto. O canal real so e visivel no campo `type` de cada mensagem individual (tipo 17 ou 18 = Instagram).

O codigo atual em `ghl-sync-conversations/index.ts` usa `resolveChannel(ghlConv.type, ghlConv.lastMessageType)` para determinar o canal, resultando em "sms" para conversas que na realidade sao do Instagram.

Alem disso, a logica de reclassificacao (linha 569) so corrige conversas com canal `"other"` -- conversas ja marcadas como `"sms"` nunca sao reclassificadas.

## Solucao

### Ficheiro: `supabase/functions/ghl-sync-conversations/index.ts`

**a) Reclassificar com base nas mensagens individuais:**

Apos buscar as mensagens de uma conversa, verificar os tipos das mensagens para determinar o canal real. Se alguma mensagem tiver tipo 17 ou 18 (Instagram), reclassificar a conversa de "sms" para "instagram".

Adicionar logica apos o loop de mensagens (depois da linha ~650):

```text
// Apos processar todas as mensagens, verificar se o canal precisa de reclassificacao
// Coletar os tipos das mensagens processadas
// Se encontrar tipo 17/18 e a conversa esta como "sms" -> atualizar para "instagram"
// Mesma logica para tipo 15/16 (whatsapp), 5/19 (messenger), etc.
```

**b) Expandir reclassificacao para alem de "other":**

Na linha 569, mudar a condicao de `existingConv?.channel === "other"` para tambem incluir `"sms"` quando o canal resolvido for mais especifico (instagram, whatsapp, messenger):

```text
// ANTES
if (existingConv?.channel === "other" && channel !== "other")

// DEPOIS  
if ((existingConv?.channel === "other" || existingConv?.channel === "sms") && 
    channel !== "other" && channel !== "sms" && 
    channel !== existingConv?.channel)
```

**c) Inferir canal a partir das mensagens quando o canal da conversa e "sms":**

Apos o loop de mensagens, se o canal inicial era "sms", analisar os tipos das mensagens para determinar o canal real e atualizar a conversa:

```text
// Recolher os tipos das mensagens num Set
// Se contem tipo 17 ou 18 -> canal real = "instagram"
// Se contem tipo 15 ou 16 -> canal real = "whatsapp"  
// Se o canal real != canal atual da conversa -> UPDATE
```

### Ficheiro: `supabase/functions/cron-sync-messages/index.ts`

**Mesma logica de reclassificacao apos processar mensagens:**

No cron sync, apos inserir mensagens, verificar se os tipos indicam um canal diferente do registado na conversa e atualizar.

## Detalhes tecnicos

### Alteracoes em `ghl-sync-conversations/index.ts`

1. No loop de mensagens (linhas 612-650), acumular os `msg.type` num array/set
2. Apos o loop, determinar o "canal real" com base nos tipos das mensagens
3. Se o canal real for diferente do canal da conversa e mais especifico (nao "sms"/"other"), atualizar a conversa
4. Expandir condicao de reclassificacao na linha 569

### Alteracoes em `cron-sync-messages/index.ts`

1. Mesma logica: apos inserir mensagens, verificar tipos e reclassificar se necessario

### Ficheiros a modificar

| Ficheiro | Alteracao |
|---|---|
| `supabase/functions/ghl-sync-conversations/index.ts` | Inferir canal real a partir dos tipos de mensagens; expandir reclassificacao |
| `supabase/functions/cron-sync-messages/index.ts` | Mesma logica de reclassificacao baseada nos tipos de mensagens |

## Resultado esperado

- Conversas do Instagram que estavam como "sms" serao reclassificadas para "instagram" na proxima sincronizacao
- Novas conversas do Instagram serao criadas com o canal correto
- O utilizador pode clicar "Sincronizar tudo" para forcar a reclassificacao de todas as conversas existentes
