

# Corrigir EVOLUTION_API_URL (re-atualização)

## Diagnóstico
Os logs mais recentes (15:08:10Z) confirmam que a edge function `whatsapp-qr-connect` ainda lê `https://test123456789` como valor de `EVOLUTION_API_URL`. A atualização anterior não surtiu efeito.

## Solução
1. **Re-atualizar o secret** `EVOLUTION_API_URL` com o valor correto:
   ```
   https://evolution-api-production-e886.up.railway.app
   ```
2. **Re-deploy da edge function** `whatsapp-qr-connect` para garantir que o novo valor é carregado.
3. **Testar** com `curl_edge_functions` para confirmar que o URL correto é utilizado.

## Ficheiros alterados
Nenhum — apenas atualização de secret runtime e re-deploy.

