
# Corrigir Logs de Auditoria que nao Aparecem

## Problema

Os logs existem na base de dados (21 registos encontrados), mas nao aparecem no painel porque a politica de seguranca (RLS) usa uma funcao errada que nunca retorna `true`.

## Causa Raiz

A tabela `admin_audit_logs` tem uma politica SELECT que usa:
```
has_role(auth.uid(), 'super_admin')
```

Mas a funcao `has_role` compara `auth.uid()` directamente com `user_roles.user_id`. O problema e que `user_roles.user_id` guarda o ID do perfil (`profiles.id`), NAO o `auth.uid()`. Sao UUIDs diferentes.

A funcao `is_super_admin()` (usada no resto do sistema) faz a conversao correcta: `auth.uid()` -> `profiles.user_id` -> `profiles.id` -> `user_roles.user_id`.

## Solucao

Actualizar a politica RLS de SELECT na tabela `admin_audit_logs` para usar `is_super_admin()` em vez de `has_role(auth.uid(), 'super_admin')`.

### Migracao SQL

```sql
-- Drop the broken SELECT policy
DROP POLICY IF EXISTS "Super admins can view audit logs" ON public.admin_audit_logs;

-- Recreate with the correct function
CREATE POLICY "Super admins can view audit logs"
ON public.admin_audit_logs
FOR SELECT
TO authenticated
USING (public.is_super_admin());
```

Tambem corrigir a politica de INSERT (mesma razao - os inserts via cliente JS tambem podem falhar):

```sql
DROP POLICY IF EXISTS "Super admins can insert audit logs" ON public.admin_audit_logs;

CREATE POLICY "Super admins can insert audit logs"
ON public.admin_audit_logs
FOR INSERT
TO authenticated
WITH CHECK (public.is_super_admin());
```

Nota: a funcao `log_admin_action` e SECURITY DEFINER (executa como postgres), por isso os inserts via RPC funcionam independentemente do RLS. Mas corrigir a politica de INSERT e boa pratica.

## Ficheiros a modificar

| Ficheiro | Accao |
|---|---|
| Nova migracao SQL | Corrigir as 2 politicas RLS de `admin_audit_logs` |

Nenhum ficheiro de codigo precisa de alteracao - o `LogsSection.tsx` ja faz a query correcta.

## Resultado esperado

- Os 21 logs existentes aparecem imediatamente na tabela
- Novos logs continuam a ser escritos normalmente via `log_admin_action` RPC
- Apenas super admins conseguem ver e inserir logs
