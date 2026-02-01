

# Plano: Corrigir Login do Portal do Cliente

## Diagnóstico Completo

O problema foi identificado através de análise detalhada da base de dados e do código:

### Situação Actual

```text
TABELA profiles (CRM)
├── id: 4fef01e3-0141-4bee-8309-0bac5d4fb6ae
├── email: jorge.cardoso@digital4ads.pt
└── role: super_admin

TABELA client_users (Portal Cliente)
├── auth_user_id: 444ba746-3e86-4283-a363-ad2b27b81dc9 ← ID ERRADO!
├── email: jorge.cardoso@digital4ads.pt
└── status: active
```

### Porque Falha

```text
1. Utilizador faz login em /client/login
   ↓
2. Supabase retorna sessão com user.id = 4fef01e3... (ID do CRM)
   ↓
3. useClientAuth procura: client_users WHERE auth_user_id = 4fef01e3...
   ↓
4. NÃO ENCONTRA porque client_users tem auth_user_id = 444ba746...
   ↓
5. isAuthenticated = !!user && !!clientUser = true && false = FALSE
   ↓
6. ClientLayout redireciona para /client/login
   ↓
7. LOOP INFINITO
```

## Soluções Necessárias

### 1. Correcção de Dados (Imediata)

Actualizar o `client_users.auth_user_id` para apontar para o utilizador auth correcto:

```sql
UPDATE client_users 
SET auth_user_id = '4fef01e3-0141-4bee-8309-0bac5d4fb6ae'
WHERE email = 'jorge.cardoso@digital4ads.pt';
```

### 2. Melhoria do Hook useClientAuth

Adicionar tratamento para quando o utilizador está autenticado mas não tem registo de cliente:

```typescript
// Antes de retornar isAuthenticated
const hasAuthButNoClient = !!user && !clientUser && !loading;

return {
  // ...
  isAuthenticated: !!user && !!clientUser,
  hasAuthButNoClient, // Nova propriedade para UI feedback
};
```

### 3. Melhoria da Página de Login

Mostrar mensagem clara quando o utilizador está autenticado mas não é cliente:

```typescript
// No ClientLoginPage
if (user && !clientUser && !loading) {
  return (
    <Alert variant="destructive">
      Esta conta não está associada ao portal de clientes.
      Por favor contacte o suporte.
    </Alert>
  );
}
```

### 4. Correcção do Edge Function (Prevenção Futura)

O edge function `create-client-auth-user` já tem lógica para reutilizar utilizadores existentes, mas pode não estar a funcionar correctamente. Verificar se:
- A busca por utilizador existente funciona
- O ID correcto é usado ao actualizar client_users

## Ficheiros a Modificar

### 1. src/hooks/client-portal/useClientAuth.ts

| Linha | Alteração |
|-------|-----------|
| Interface | Adicionar `hasAuthButNoClient: boolean` |
| Return | Adicionar propriedade para detectar utilizador sem cliente |

### 2. src/pages/client/ClientLoginPage.tsx

| Linha | Alteração |
|-------|-----------|
| Novo bloco | Mostrar mensagem de erro quando utilizador não é cliente |
| UX | Evitar loop infinito mostrando estado claro |

### 3. Dados na Base de Dados

| Tabela | Alteração |
|--------|-----------|
| client_users | Corrigir auth_user_id para jorge.cardoso@digital4ads.pt |

## Fluxo Corrigido

```text
CENÁRIO A: Utilizador é cliente válido
1. Login → Sessão com user.id
2. Query encontra client_users com auth_user_id = user.id
3. isAuthenticated = TRUE
4. Acesso ao portal

CENÁRIO B: Utilizador autenticado mas NÃO é cliente
1. Login → Sessão com user.id
2. Query NÃO encontra client_users
3. hasAuthButNoClient = TRUE
4. Mostra mensagem: "Esta conta não está associada ao portal"
5. NÃO redireciona (evita loop)

CENÁRIO C: Utilizador não autenticado
1. Mostra formulário de login
```

## Resultado Esperado

Após as alterações:

| Cenário | Antes | Depois |
|---------|-------|--------|
| Cliente válido | Loop infinito | Acede ao dashboard |
| Utilizador CRM sem cliente | Loop infinito | Mensagem clara de erro |
| Utilizador novo | Funciona | Continua a funcionar |
| Credenciais erradas | Funciona | Continua a funcionar |

## Detalhes Técnicos

### Hook Actualizado

```typescript
export function useClientAuth(): UseClientAuthReturn {
  // ... estados existentes ...

  // Detectar utilizador auth sem registo de cliente
  const hasAuthButNoClient = !!user && !clientUser && !loading && !error;

  return {
    user,
    clientUser,
    loading,
    error,
    signIn,
    signOut,
    isAuthenticated: !!user && !!clientUser,
    hasAuthButNoClient, // NOVA PROPRIEDADE
  };
}
```

### Página de Login Actualizada

```typescript
export default function ClientLoginPage() {
  const { signIn, loading, error, isAuthenticated, user, clientUser, hasAuthButNoClient } = useClientAuth();
  
  // ... código existente ...

  // NOVO: Mostrar erro claro quando utilizador não é cliente
  if (hasAuthButNoClient) {
    return (
      <div className="min-h-screen flex items-center justify-center ...">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Acesso Não Autorizado</CardTitle>
            <CardDescription>
              Esta conta não está registada como cliente do portal.
              Por favor contacte o administrador.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={signOut} variant="outline" className="w-full">
              Terminar Sessão
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ... resto do código ...
}
```

### Correcção de Dados SQL

```sql
-- Corrigir o auth_user_id para o utilizador jorge.cardoso@digital4ads.pt
UPDATE client_users 
SET auth_user_id = '4fef01e3-0141-4bee-8309-0bac5d4fb6ae'
WHERE email = 'jorge.cardoso@digital4ads.pt'
AND auth_user_id = '444ba746-3e86-4283-a363-ad2b27b81dc9';
```

