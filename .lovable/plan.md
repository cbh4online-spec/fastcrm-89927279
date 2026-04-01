

# Corrigir erro 401 Unauthorized na Evolution API

## Diagnóstico

Os logs mais recentes revelam a causa raiz:

```
Create instance response (401): {"status":401,"error":"Unauthorized","response":{"message":"Unauthorized"}}
Evolution connect error: { status: 404, error: "Not Found", response: { message: ['The "ws_d9e3d0ae589341e9" instance does not exist'] } }
```

**Sequência de falha:**
1. A criação da instância falha com **401 Unauthorized** — o `EVOLUTION_API_KEY` está incorreto ou não corresponde à chave configurada na instância Railway.
2. Como a instância não foi criada, o pedido de conexão retorna **404 Not Found**.
3. A edge function devolve 500 ao frontend → modal mostra "Edge Function returned a non-2xx status code".

**O URL está correto** (já sem duplicação de path). O problema é exclusivamente a **chave API**.

## Solução

1. **Atualizar o secret `EVOLUTION_API_KEY`** com o valor correto da variável `AUTHENTICATION_API_KEY` configurada na instância Railway da Evolution API.
2. **Melhorar o tratamento de erro** na edge function para que o 401 devolva uma mensagem clara ao utilizador ("Chave API inválida") em vez de tentar continuar com o connect.
3. **Re-deploy** da edge function.

## Alterações técnicas

### `supabase/functions/whatsapp-qr-connect/index.ts`
- Após o `createRes`, verificar se `status === 401` e retornar erro explícito ao frontend ("EVOLUTION_API_KEY inválida — verifique a configuração").
- Só avançar para o `/instance/connect/` se a criação teve sucesso (2xx) ou se a instância já existe (409).

### Secret
- Re-atualizar `EVOLUTION_API_KEY` com o valor correto da instância Railway.

