

## Limpar instâncias órfãs da Evolution API

### Diagnóstico
Os logs mostram 5 instâncias de teste em `NOT CONNECTION` que nunca foram limpas:
- `whatsapp-mte`
- `ws_test`
- `ws_testworkspace`
- `ws_testworkspaceid`
- `whatsapp-test`

A instância real (`ws_d9e3d0ae589341e9`) está operacional.

### Plano

**1. Criar edge function administrativa `whatsapp-admin-cleanup`**
- Aceita um array de `instanceNames` para apagar
- Valida JWT + verifica que o utilizador é super admin
- Para cada instância, chama `DELETE /instance/delete/{name}` na Evolution API via `evoFetch`
- Devolve relatório com sucesso/falha por instância
- Função one-shot — pode ser apagada depois

**2. Executar a limpeza**
- Invocar a função com as 5 instâncias órfãs
- Verificar nos logs que foram todas removidas

### Detalhes técnicos
- Reutiliza o helper `evolution-api.ts` existente (auth, evoFetch, CORS)
- Restrição: apenas super admins podem invocar
- Ficheiro: `supabase/functions/whatsapp-admin-cleanup/index.ts`

