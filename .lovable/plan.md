

# Corrigir EVOLUTION_API_URL

## Problema
O secret `EVOLUTION_API_URL` contém um valor placeholder inválido, causando falha DNS na edge function `whatsapp-qr-connect`.

## Solução
Atualizar o secret `EVOLUTION_API_URL` com o valor correcto:

```
https://evolution-api-production-e886.up.railway.app
```

**Sem `/webhook`** — a edge function já constrói os endpoints necessários (e.g. `/instance/create`, `/instance/connect/{name}`).

## Validação
Após atualizar o secret, testar a edge function `whatsapp-qr-connect` para confirmar que a ligação à Evolution API funciona.

## Ficheiros alterados
Nenhum ficheiro de código precisa de alteração — apenas o valor do secret runtime.

