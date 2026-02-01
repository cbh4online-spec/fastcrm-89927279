
# Plano: Corrigir Loading Infinito no Portal do Cliente

## Diagnostico Detalhado

Foram identificados multiplos problemas que causam o loading infinito na pagina de login do portal do cliente:

### Problema 1: signIn nao define loading=false no sucesso

No hook `useClientAuth`, a funcao `signIn` define `setLoading(true)` no inicio, mas quando o login e bem sucedido, nao chama `setLoading(false)`:

```text
signIn()
  ├── setLoading(true)          ← Loading activado
  ├── signInWithPassword()
  ├── if (error) 
  │     └── setLoading(false)   ← Apenas no erro!
  └── return { error: null }    ← Loading continua TRUE
```

O codigo depende do `onAuthStateChange` para definir `loading=false`, mas isso pode ter delays ou falhar.

### Problema 2: Race condition no fluxo de autenticacao

O fluxo actual tem uma dependencia fragil:

```text
1. signIn() → loading = true
2. Supabase auth bem sucedido
3. Espera onAuthStateChange disparar (pode demorar)
4. onAuthStateChange → loading = false
5. Pagina finalmente renderiza

Se o passo 3-4 falhar ou demorar → loading infinito
```

### Problema 3: Nao ha timeout de seguranca

Se a comunicacao com Supabase falhar silenciosamente, nao ha mecanismo de fallback para mostrar a pagina de login.

## Solucao Proposta

A correcao sera feita em dois ficheiros:

### 1. useClientAuth.ts

**Alteracao A**: Adicionar `setLoading(false)` apos login bem sucedido

```typescript
const signIn = async (email: string, password: string) => {
  setLoading(true);
  setError(null);
  
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  
  if (error) {
    setError(error.message);
    setLoading(false);
    return { error };
  }
  
  // O onAuthStateChange ira disparar, mas definimos loading=false
  // aqui tambem para evitar race conditions
  setLoading(false);
  return { error: null };
};
```

**Alteracao B**: Adicionar timeout de seguranca no useEffect

Garantir que o loading nunca fica preso indefinidamente:

```typescript
useEffect(() => {
  let isMounted = true;
  
  // Timeout de seguranca - se nao resolver em 10 segundos, para o loading
  const timeout = setTimeout(() => {
    if (isMounted && loading) {
      console.warn("Auth timeout - forcing loading to false");
      setLoading(false);
    }
  }, 10000);
  
  // ... resto do codigo existente ...
  
  return () => {
    isMounted = false;
    clearTimeout(timeout);
    subscription.unsubscribe();
  };
}, []);
```

### 2. ClientLoginPage.tsx (Opcional - Melhoria de UX)

Adicionar um timeout local para mostrar mensagem de erro se o loading demorar demasiado:

```typescript
const [loadingTimeout, setLoadingTimeout] = useState(false);

useEffect(() => {
  if (loading) {
    const timer = setTimeout(() => setLoadingTimeout(true), 8000);
    return () => clearTimeout(timer);
  }
  setLoadingTimeout(false);
}, [loading]);

if (loading) {
  return (
    <div className="...">
      <Loader2 className="..." />
      {loadingTimeout && (
        <p className="mt-4 text-muted-foreground">
          A ligacao esta a demorar. Por favor, atualize a pagina.
        </p>
      )}
    </div>
  );
}
```

## Ficheiros a Modificar

### useClientAuth.ts

| Alteracao | Descricao |
|-----------|-----------|
| Linha 100 | Adicionar `setLoading(false)` apos login bem sucedido |
| Linhas 22-88 | Adicionar timeout de seguranca no useEffect |

### ClientLoginPage.tsx (Opcional)

| Alteracao | Descricao |
|-----------|-----------|
| Novo estado | Adicionar `loadingTimeout` para mostrar mensagem de erro |
| Render condicional | Mostrar aviso se loading demorar muito |

## Fluxo Corrigido

```text
ANTES:
signIn() → loading=true → espera onAuthStateChange → (pode nunca chegar)

DEPOIS:
signIn() → loading=true → login sucesso → loading=false imediatamente
                                       ↓
                          onAuthStateChange tambem define loading=false (redundante mas seguro)
```

## Resultado Esperado

| Cenario | Antes | Depois |
|---------|-------|--------|
| Login bem sucedido | Loading pode ficar preso | Pagina carrega imediatamente |
| Timeout de comunicacao | Loading infinito | Pagina mostra apos 10s max |
| Erro de rede | Loading infinito | Mensagem de erro apos timeout |
| Utilizador ja autenticado | Pode demorar | Redireciona rapidamente |

## Detalhes Tecnicos

### Alteracao Principal (useClientAuth.ts linha 100)

Antes:
```typescript
return { error: null };
```

Depois:
```typescript
setLoading(false);
return { error: null };
```

### Timeout de Seguranca (useClientAuth.ts)

Adicionar dentro do useEffect existente:

```typescript
// Safety timeout - never stay in loading state forever
const loadingTimeout = setTimeout(() => {
  if (isMounted) {
    console.warn("Client auth: Loading timeout reached");
    setLoading(false);
  }
}, 10000);

// No return do cleanup:
return () => {
  isMounted = false;
  clearTimeout(loadingTimeout);
  subscription.unsubscribe();
};
```

Esta abordagem resolve o problema de forma robusta sem quebrar o fluxo existente.
