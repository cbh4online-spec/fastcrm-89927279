

# Plano: Corrigir Erro de Foreign Key na Criação de Clientes B2B

## Diagnóstico do Problema

A tabela `client_users` tem a seguinte estrutura:

```
auth_user_id: uuid (NOT NULL) -> FOREIGN KEY para auth.users(id)
```

O código actual tenta inserir um UUID aleatório gerado com `crypto.randomUUID()`, mas este UUID não existe na tabela `auth.users`, violando a constraint de foreign key.

## Solução Proposta

### Opção Implementada: Tornar `auth_user_id` Nullable

A abordagem correcta para um sistema de convites B2B é permitir que `auth_user_id` seja NULL até que o cliente aceite o convite e crie uma conta. O fluxo correcto é:

```text
1. Admin cria registo client_user (auth_user_id = NULL, status = 'pending')
2. Sistema envia email de convite com link único
3. Cliente clica no link e cria conta
4. Sistema associa o auth_user_id ao registo existente
5. Status muda para 'active'
```

## Alterações Necessárias

### 1. Migração da Base de Dados

Alterar a coluna `auth_user_id` para permitir NULL:

```sql
-- Permitir NULL na coluna auth_user_id para suportar fluxo de convites
ALTER TABLE public.client_users 
  ALTER COLUMN auth_user_id DROP NOT NULL;

-- Adicionar comentário explicativo
COMMENT ON COLUMN public.client_users.auth_user_id IS 
  'ID do utilizador autenticado. NULL enquanto o convite está pendente.';
```

### 2. Actualizar Código (InviteClientDialog.tsx)

Remover a geração de UUID temporário e inserir NULL:

```typescript
// ANTES (linha 190-196):
const tempAuthUserId = crypto.randomUUID();
// ...
auth_user_id: tempAuthUserId,

// DEPOIS:
// Remover tempAuthUserId
// ...
auth_user_id: null,  // Será preenchido quando o cliente aceitar o convite
```

### 3. Actualizar TypeScript Types (client-user.ts)

Actualizar o tipo para reflectir que `auth_user_id` pode ser null:

```typescript
export interface ClientUser {
  id: string;
  auth_user_id: string | null;  // NULL para convites pendentes
  // ... resto igual
}
```

## Fluxo de Dados Corrigido

```text
+------------------+     +-------------------+     +------------------+
|  Admin cria      |     |  Cliente recebe   |     |  Cliente cria    |
|  client_user     | --> |  email convite    | --> |  conta no portal |
|  (pending, NULL) |     |                   |     |  (active, uuid)  |
+------------------+     +-------------------+     +------------------+
```

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| **Base de Dados** | Migração: `ALTER COLUMN auth_user_id DROP NOT NULL` |
| `src/components/client-users/InviteClientDialog.tsx` | Remover `tempAuthUserId`, passar `null` |
| `src/types/client-user.ts` | Actualizar tipo: `auth_user_id: string \| null` |

## Detalhes Técnicos

- A constraint `ON DELETE CASCADE` mantém-se intacta - quando um utilizador auth é eliminado, o registo client_user também é eliminado
- Os registos pendentes (sem auth_user_id) não são afectados pelo CASCADE pois têm NULL
- O hook `useClientAuth.ts` já filtra por `status: 'active'`, pelo que clientes pendentes não conseguem fazer login
- Esta é a arquitectura padrão para sistemas de convites B2B

