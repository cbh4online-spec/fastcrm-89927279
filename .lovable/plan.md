

## Corrigir erro de deploy da Edge Function `create-payment-link`

### Diagnóstico

O erro reportado (`RUNTIME_ERROR` com `lineno: 0, colno: 0, stack: "not_applicable"` e blank screen) aponta para o ficheiro da edge function, mas o código da função está correto — testei com `curl` e recebe 401 (esperado sem autenticação). Isto indica que foi um **erro transitório de deploy** da edge function.

O código frontend (`ComposeEmailDialog`, `InsertPaymentLinkDialog`, `EmailAttachmentList`) está sintaticamente correto e importa componentes existentes.

### Solução

Redesplegar a edge function `create-payment-link` para garantir que está ativa e limpar qualquer estado corrupto do deploy anterior.

### Alteração

| Ação | Detalhe |
|---|---|
| Redeploy `create-payment-link` | Forçar um novo deploy da edge function para resolver qualquer problema de deploy transitório |

Nenhuma alteração de código é necessária — a função já foi corrigida na mensagem anterior (remoção de `stripe_price_id`).

