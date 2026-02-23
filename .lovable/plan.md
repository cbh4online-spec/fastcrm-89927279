

# Corrigir erro ao enviar mensagem SMS sem numero de telefone

## Problema

Ao tentar enviar uma mensagem na conversa de "paulasoares.bealeader" (canal SMS), o GHL retorna erro 422: "Missing phone number". O lead nao tem numero de telefone registado, tornando impossivel o envio por SMS.

O erro aparece como "Falha ao enviar mensagem" generico, sem indicar ao utilizador qual e o problema real.

## Causa raiz

1. O lead "paulasoares.bealeader" tem `phone: null` na base de dados
2. O canal da conversa e `sms`, que requer numero de telefone
3. A edge function `ghl-send-message` tenta enviar sem validar a existencia do telefone
4. O erro do GHL e propagado mas nao e traduzido para uma mensagem util ao utilizador

## Solucao

### 1. Edge function: `supabase/functions/ghl-send-message/index.ts`

Adicionar validacao antes de enviar mensagens SMS: verificar se o lead/contacto tem telefone. Se nao tiver, retornar erro 422 com mensagem clara em vez de delegar ao GHL.

Apos obter o `lead` e `contact` (linha ~70), adicionar:

```typescript
// Para SMS, verificar se existe telefone
const effectiveChannel = channel || conversation.channel || "sms";
if (effectiveChannel === "sms") {
  const contactPhone = phone || lead?.phone || contact?.phone;
  if (!contactPhone) {
    return new Response(
      JSON.stringify({ 
        error: "Este contacto não tem número de telefone. Adicione um número ao lead antes de enviar SMS.",
        code: "MISSING_PHONE"
      }),
      { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}
```

### 2. Hook: `src/hooks/useMessages.ts`

No bloco que processa a resposta do `ghl-send-message` (linhas 145-150), melhorar o tratamento de erro para extrair a mensagem do GHL em vez de mostrar erro generico:

```typescript
if (error) throw error;
if (data?.error) throw new Error(data.error);
```

Isto ja esta correcto -- o `data.error` contem a mensagem descritiva. O problema e que o `error` do `functions.invoke` e lancado primeiro quando o status nao e 2xx.

Alterar para capturar o corpo da resposta mesmo em caso de erro:

```typescript
const { data, error } = await mainClient.functions.invoke("ghl-send-message", {
  body: { conversationId, message: content, channel: conversation.channel },
});

if (error) {
  // Try to extract meaningful error from response
  const errorMsg = data?.error || error.message;
  throw new Error(errorMsg);
}
if (data?.error) throw new Error(data.error);
```

### 3. Componente: `src/components/inbox/ConversationDetail.tsx`

Melhorar o `handleSendMessage` (linha 136) para mostrar a mensagem de erro real em vez de "Falha ao enviar mensagem" generico:

```typescript
const handleSendMessage = async (content: string) => {
  if (!conversationId) return;
  try {
    await sendMessage.mutateAsync({ conversationId, content });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Falha ao enviar mensagem";
    toast.error(msg);
  }
};
```

## Ficheiros a modificar

| Ficheiro | Alteracao |
|---|---|
| `supabase/functions/ghl-send-message/index.ts` | Validacao de telefone antes de enviar SMS |
| `src/hooks/useMessages.ts` | Extrair mensagem de erro detalhada |
| `src/components/inbox/ConversationDetail.tsx` | Mostrar mensagem de erro real no toast |

## Resultado esperado

- Quando o lead nao tem telefone e o canal e SMS, o utilizador ve: "Este contacto nao tem numero de telefone. Adicione um numero ao lead antes de enviar SMS."
- Outros erros do GHL tambem mostram a mensagem real em vez do generico "Falha ao enviar mensagem"
- Validacao feita antes de chamar o GHL para evitar chamadas desnecessarias

