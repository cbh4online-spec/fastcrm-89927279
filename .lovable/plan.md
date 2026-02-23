

# Corrigir validacao SMS e propagacao de erro

## Problema actual

A validacao de telefone adicionada nao esta a funcionar porque:

1. **Channel case-sensitivity**: O check `effectiveChannel === "sms"` pode falhar se o canal estiver guardado como `"SMS"`, `"Sms"`, ou outro formato
2. **Status 500 generico**: Quando o GHL retorna erro 422 "Missing phone number", a edge function devolve status 500 (linha 410), o que faz o Supabase SDK tratar como erro de rede e o `data` fica inacessivel no cliente
3. **Dupla fonte de erro**: Mesmo que a validacao funcione, o `functions.invoke` do Supabase nao disponibiliza o `data` quando o status nao e 2xx, entao `data?.error` no hook e sempre `undefined`

## Solucao

### 1. Edge function: `supabase/functions/ghl-send-message/index.ts`

**a)** Normalizar o canal para lowercase na validacao (linha 76):
```typescript
const effectiveChannel = (channel || conversation.channel || "sms").toLowerCase();
```

**b)** Alterar o status do erro generico do GHL (linha 410) de 500 para 422 quando o GHL retorna 422, para que o status real seja preservado:
```typescript
{ status: sendResponse.status >= 400 && sendResponse.status < 500 ? sendResponse.status : 500 }
```

**c)** Tambem melhorar a mensagem de erro para "Missing phone number" especificamente -- adicionar deteccao antes do bloco generico (apos o check de Instagram, linha 397):
```typescript
if (responseText.includes("Missing phone number")) {
  return new Response(
    JSON.stringify({ 
      error: "Este contacto não tem número de telefone. Adicione um número ao lead antes de enviar SMS.",
      code: "MISSING_PHONE"
    }),
    { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
```

### 2. Hook: `src/hooks/useMessages.ts`

O problema e que quando `functions.invoke` recebe status nao-2xx, o `error` e preenchido mas o `data` pode conter o body da resposta OU ser null. Precisamos tentar parsear a mensagem do `error.message` que pode conter o JSON:

```typescript
if (error) {
  // functions.invoke wraps non-2xx as FunctionsHttpError with context in message
  let errorMsg = "Falha ao enviar mensagem";
  try {
    // Try to parse error context (may contain JSON body)
    const ctx = (error as any)?.context;
    if (ctx?.json) {
      const body = await ctx.json();
      errorMsg = body?.error || errorMsg;
    } else if (data?.error) {
      errorMsg = data.error;
    } else {
      errorMsg = error.message || errorMsg;
    }
  } catch {
    errorMsg = data?.error || error.message || errorMsg;
  }
  throw new Error(errorMsg);
}
```

### 3. Componente: `src/components/inbox/ConversationDetail.tsx`

Ja corrigido na ultima alteracao -- mostra `error.message` no toast. Sem alteracao adicional necessaria.

## Ficheiros a modificar

| Ficheiro | Alteracao |
|---|---|
| `supabase/functions/ghl-send-message/index.ts` | Normalizar canal para lowercase; detectar "Missing phone number" do GHL; preservar status code real |
| `src/hooks/useMessages.ts` | Extrair mensagem de erro do FunctionsHttpError context |

## Resultado esperado

- A validacao previa funciona independentemente do case do canal
- Se a validacao falhar (ex: canal nao e "sms" mas GHL exige telefone), o erro do GHL e traduzido para mensagem clara
- O utilizador ve "Este contacto nao tem numero de telefone..." em vez de erro generico
