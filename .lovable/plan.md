
# Plano: Correcao do Loading Infinito no Login do Portal Cliente

## Problema Identificado

Apos analise detalhada do fluxo de autenticacao, foi identificado o seguinte problema critico:

### Diagnostico

O login e bem sucedido (confirmado pelo request POST a `/auth/v1/token` com status 200), mas a query a tabela `client_users` nunca e executada. Isto causa o loading infinito.

```text
Fluxo Actual (BUG):
1. signIn() e chamado
   └── setAuthLoading(true)           ← Loading activado
   
2. signInWithPassword() retorna sucesso
   └── Login concluido com sucesso
   
3. signIn() retorna { error: null }
   └── NAO define authLoading=false    ← BUG!
   
4. Espera onAuthStateChange disparar...
   └── Pode nao disparar se sessao ja existia
   
5. Loading fica TRUE indefinidamente
   └── UI mostra spinner para sempre
```

### Causa Raiz

Na funcao `signIn` (linhas 111-127), quando o login e bem sucedido:
- O codigo NAO chama `setAuthLoading(false)` 
- Depende 100% do `onAuthStateChange` para resolver o loading
- Se o `onAuthStateChange` nao dispara (ou dispara antes do signIn completar), o loading nunca termina

### Evidencia

No network logs:
- POST `/auth/v1/token` → Status 200 (login bem sucedido)
- NAO existe pedido a `/rest/v1/client_users` (nunca e chamado)

## Solucao Proposta

### Alteracao no useClientAuth.ts

A funcao `signIn` deve:
1. Chamar `fetchClientUser` directamente apos login bem sucedido
2. Definir `authLoading=false` quando tudo estiver completo
3. NAO depender exclusivamente do `onAuthStateChange`

### Codigo Corrigido

```typescript
const signIn = async (email: string, password: string) => {
  setAuthLoading(true);
  setClientChecked(false);
  setError(null);
  
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  
  if (error) {
    setError(error.message);
    setAuthLoading(false);
    setClientChecked(true);
    return { error };
  }
  
  // CORRECAO: Se login bem sucedido, buscar clientUser directamente
  if (data?.user) {
    setUser(data.user);
    await fetchClientUser(data.user.id);
  }
  
  setAuthLoading(false);
  return { error: null };
};
```

### Fluxo Corrigido

```text
DEPOIS:
1. signIn() e chamado
   └── setAuthLoading(true)
   
2. signInWithPassword() retorna sucesso + user data
   └── Login concluido
   
3. signIn() processa o sucesso:
   ├── setUser(data.user)              ← Define user imediatamente
   ├── await fetchClientUser(...)      ← Busca client_users
   └── setAuthLoading(false)           ← Resolve loading
   
4. isAuthenticated ou hasAuthButNoClient definidos correctamente
   └── UI redireciona ou mostra erro apropriado
```

## Alteracoes Detalhadas

### Ficheiro: src/hooks/client-portal/useClientAuth.ts

| Linha | Alteracao | Descricao |
|-------|-----------|-----------|
| 111-127 | Refactoring signIn | Adicionar tratamento directo do resultado do login |
| 116 | Capturar data | Mudar para `const { data, error }` |
| 123-126 | Adicionar logica | Chamar fetchClientUser directamente |
| 127 | Novo | Adicionar `setAuthLoading(false)` antes do return |

### Codigo Completo da Funcao signIn

```typescript
const signIn = async (email: string, password: string) => {
  setAuthLoading(true);
  setClientChecked(false);
  setError(null);
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ 
      email, 
      password 
    });
    
    if (error) {
      console.error("Sign in error:", error);
      setError(error.message);
      setAuthLoading(false);
      setClientChecked(true);
      return { error };
    }
    
    // Login bem sucedido - processar directamente
    if (data?.user) {
      console.log("Sign in successful, fetching client user:", data.user.email);
      setUser(data.user);
      await fetchClientUser(data.user.id);
    } else {
      console.warn("Sign in returned no user data");
      setClientChecked(true);
    }
    
    setAuthLoading(false);
    return { error: null };
  } catch (err) {
    console.error("Sign in exception:", err);
    setError("Erro inesperado durante o login");
    setAuthLoading(false);
    setClientChecked(true);
    return { error: err as Error };
  }
};
```

## Beneficios da Correcao

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Login bem sucedido | Pode ficar em loading infinito | Resolve imediatamente |
| Dependencia onAuthStateChange | 100% dependente (fragil) | Backup apenas (robusto) |
| Query client_users | Pode nunca executar | Sempre executa apos login |
| Tratamento de erros | Pode deixar estados inconsistentes | Sempre limpa estados |

## Resultado Esperado

1. Utilizador insere credenciais e clica "Entrar"
2. Loading aparece (maximo 2-3 segundos)
3. Se cliente valido: redireciona para dashboard
4. Se nao e cliente: mostra mensagem "Acesso Nao Autorizado"
5. Se credenciais invalidas: mostra erro de credenciais

## Testes Recomendados

Apos implementacao, testar:
1. Login com cliente valido (jorge.cardoso@digital4ads.pt)
2. Login com utilizador CRM sem registo de cliente
3. Login com credenciais invalidas
4. Refresh da pagina apos login
5. Logout e novo login
