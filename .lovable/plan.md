
## Diagnóstico: Sem acesso ao Suporte

O problema identificado e a sua causa:

1. **Nenhum utilizador tem roles atribuídas** na tabela `client_user_roles`
2. O codigo tem um fallback que deveria tratar esses utilizadores como `client_admin`, MAS...
3. A **politica de seguranca** (RLS) da tabela `client_user_roles` so permite leitura a quem ja e `client_admin` -- isto cria um ciclo impossivel
4. Como a query falha com erro (em vez de retornar vazio), o fallback nunca e ativado, e o sistema assume zero permissoes

## Solucao

### Passo 1: Corrigir a politica de seguranca (RLS)

Adicionar uma politica que permita a cada utilizador **ler as suas proprias roles**:

```sql
CREATE POLICY "Users can view own roles"
ON public.client_user_roles
FOR SELECT TO authenticated
USING (
  client_user_id IN (
    SELECT id FROM public.client_users 
    WHERE auth_user_id = auth.uid()
  )
);
```

### Passo 2: Atribuir a role `client_admin` aos utilizadores existentes

Inserir registos na tabela `client_user_roles` para os utilizadores ativos que ainda nao tem roles.

### Passo 3: Melhorar o fallback no hook

Ajustar `useClientPermissions.ts` para que, em caso de **erro** na query (nao apenas lista vazia), tambem aplique o fallback de `client_admin`. Isto garante resiliencia mesmo que haja problemas temporarios.

## Secao Tecnica

**Ficheiros a modificar:**
- Nova migracao SQL para a politica RLS e insercao de roles em massa
- `src/hooks/client-portal/useClientPermissions.ts` -- tratar erros como fallback

**Impacto:** Apos esta correcao, todos os utilizadores do portal terao acesso imediato ao Suporte e restantes funcionalidades conforme a sua role.
