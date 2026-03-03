

# Fix: Registar Edge Functions no config.toml

## Problema
As edge functions `procurement-needs-recompute` e `procurement-needs-create-pos` existem no código mas **não estão registadas** no `supabase/config.toml`, por isso não são deployed — resultando no erro "Failed to send a request to the Edge Function".

## Solução
Adicionar ao `supabase/config.toml`:

```toml
[functions.procurement-needs-recompute]
verify_jwt = false

[functions.procurement-needs-create-pos]
verify_jwt = false
```

Alteração de 1 ficheiro, 6 linhas adicionadas.

