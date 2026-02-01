
# Plano: Correcao Completa do Portal do Cliente

## Diagnostico Final

Apos investigacao detalhada, foram identificados os seguintes problemas:

### Problema 1: Race Condition na Inicializacao do useClientAuth

O hook `useClientAuth` tem multiplos paths que definem o estado, causando conflitos:

```text
useEffect inicia
    ├── getSession().then() → pode definir loading=false
    ├── onAuthStateChange → pode definir loading=false
    └── loadingTimeout → pode definir loading=false

Problema: Estes podem executar em ordem incorrecta, deixando clientUser como NULL
```

### Problema 2: Logica de hasAuthButNoClient Prematura

A condicao `hasAuthButNoClient` pode ser TRUE temporariamente enquanto o `clientUser` ainda esta a ser carregado:

```typescript
// Esta condicao pode ser TRUE antes do clientUser ser populado
const hasAuthButNoClient = !!user && !clientUser && !loading && !error;
```

Quando o utilizador tem sessao activa no CRM:
1. `getSession()` encontra sessao → `user` e definido imediatamente
2. `fetchClientUser()` e chamado mas ainda esta a carregar
3. `loading` e definido como `false` antes do `clientUser` estar pronto
4. `hasAuthButNoClient = true` → mostra erro "Acesso Nao Autorizado"

### Problema 3: Fluxo de Logout Incompleto

Quando o utilizador clica "Terminar Sessao", o `signOut()` limpa a sessao do CRM tambem, causando problemas se o utilizador tinha dupla identidade.

## Solucao Proposta

### Ficheiro 1: src/hooks/client-portal/useClientAuth.ts

**Alteracoes:**

1. Adicionar estado `clientUserLoading` separado para rastrear especificamente o carregamento do clientUser
2. Corrigir a logica de `hasAuthButNoClient` para so ser TRUE quando o fetchClientUser terminou
3. Garantir que o loading so e FALSE quando AMBOS user e clientUser foram verificados

```typescript
export function useClientAuth(): UseClientAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [clientUser, setClientUser] = useState<ClientUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [clientUserLoading, setClientUserLoading] = useState(false); // NOVO
  const [clientUserChecked, setClientUserChecked] = useState(false); // NOVO
  const [error, setError] = useState<string | null>(null);

  const fetchClientUser = async (userId: string) => {
    setClientUserLoading(true); // NOVO
    try {
      const { data, error: fetchError } = await supabase
        .from("client_users")
        .select("*")
        .eq("auth_user_id", userId)
        .in("status", ["active", "pending"])
        .maybeSingle();
      
      if (fetchError) {
        setError("Erro ao carregar perfil de cliente");
        setClientUser(null);
      } else {
        setClientUser(data as ClientUser | null);
        setError(null);
      }
    } catch (err) {
      setError("Erro ao carregar perfil");
      setClientUser(null);
    } finally {
      setClientUserLoading(false); // NOVO
      setClientUserChecked(true); // NOVO
    }
  };

  // hasAuthButNoClient so e TRUE quando:
  // 1. Temos user autenticado
  // 2. NAO temos clientUser
  // 3. NAO estamos em loading geral
  // 4. NAO estamos a carregar clientUser
  // 5. JA verificamos o clientUser (fetchClientUser terminou)
  // 6. NAO ha erro
  const hasAuthButNoClient = !!user && !clientUser && !loading && !clientUserLoading && clientUserChecked && !error;
```

### Ficheiro 2: src/pages/client/ClientLoginPage.tsx

**Alteracoes:**

1. Adicionar verificacao extra para loading do clientUser
2. Melhorar mensagem de erro para ser mais clara

```typescript
// Mostrar loading enquanto qualquer parte esta a carregar
if (loading) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center ...">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="mt-4 text-sm text-muted-foreground">
        A verificar credenciais...
      </p>
      {loadingTimeout && (
        <p className="mt-2 text-sm text-muted-foreground">
          A ligacao esta a demorar. Por favor, atualize a pagina.
        </p>
      )}
    </div>
  );
}
```

### Ficheiro 3: Interface UseClientAuthReturn

Adicionar novas propriedades:

```typescript
interface UseClientAuthReturn {
  user: User | null;
  clientUser: ClientUser | null;
  loading: boolean;
  clientUserLoading: boolean; // NOVO
  error: string | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  hasAuthButNoClient: boolean;
}
```

## Fluxo Corrigido

```text
ANTES (PROBLEMATICO):
1. getSession() → user encontrado
2. loading = false (ERRO: muito cedo!)
3. hasAuthButNoClient = true (ERRO!)
4. Mostra "Acesso Nao Autorizado"

DEPOIS (CORRECTO):
1. getSession() → user encontrado
2. fetchClientUser() inicia → clientUserLoading = true
3. loading permanece true (user existe mas clientUser a carregar)
4. fetchClientUser() termina → clientUserChecked = true
5. Se clientUser existe:
   → isAuthenticated = true
   → Redireciona para dashboard
6. Se clientUser NAO existe:
   → hasAuthButNoClient = true
   → Mostra mensagem de erro
```

## Tabela de Alteracoes

| Ficheiro | Alteracao | Motivo |
|----------|-----------|--------|
| useClientAuth.ts | Adicionar `clientUserLoading` | Rastrear loading especifico |
| useClientAuth.ts | Adicionar `clientUserChecked` | Saber quando fetch terminou |
| useClientAuth.ts | Corrigir `hasAuthButNoClient` | Evitar falsos positivos |
| useClientAuth.ts | Ajustar `loading` final | So FALSE quando tudo verificado |
| ClientLoginPage.tsx | Melhorar mensagem loading | Feedback mais claro ao utilizador |

## Bugs Adicionais Detectados

### Bug 1: Erro 406 nos gdpr_consents

```text
GET /rest/v1/gdpr_consents?select=*&visitor_id=eq.v_hkjp6a3yc2dml3u1pay
Status: 406 Not Acceptable
```

Este erro indica que a tabela `gdpr_consents` existe mas o RLS esta a bloquear ou o formato do request esta errado. Requer investigacao separada.

### Bug 2: Warning de forwardRef no React Router

```text
Warning: Function components cannot be given refs.
Check the render method of `ClientPortalRoutes`.
at ClientLoginPage
```

O componente `ClientLoginPage` esta a ser passado como ref. Precisa de ser wrapped com `React.forwardRef` ou a estrutura de rotas precisa ser ajustada.

### Bug 3: Conflito de Identidade CRM/Cliente

Utilizadores que existem no CRM e no Portal do Cliente (como jorge.cardoso@digital4ads.pt) tem sessao partilhada. Quando acedem ao `/client/login` ja estao autenticados mas com a sessao do CRM activa.

**Solucao recomendada**: Separar as sessoes ou adicionar logica para detectar e tratar este caso.

## Codigo Final Sugerido

### useClientAuth.ts (Refactored)

```typescript
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import type { ClientUser } from "@/types/client-user";

interface UseClientAuthReturn {
  user: User | null;
  clientUser: ClientUser | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  hasAuthButNoClient: boolean;
}

export function useClientAuth(): UseClientAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [clientUser, setClientUser] = useState<ClientUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [clientLoading, setClientLoading] = useState(false);
  const [clientChecked, setClientChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchClientUser = useCallback(async (userId: string) => {
    setClientLoading(true);
    setClientChecked(false);
    try {
      const { data, error: fetchError } = await supabase
        .from("client_users")
        .select("*")
        .eq("auth_user_id", userId)
        .in("status", ["active", "pending"])
        .maybeSingle();
      
      if (fetchError) {
        console.error("Error fetching client user:", fetchError);
        setError("Erro ao carregar perfil de cliente");
        setClientUser(null);
      } else {
        setClientUser(data as ClientUser | null);
        setError(null);
      }
    } catch (err) {
      console.error("Exception fetching client user:", err);
      setError("Erro ao carregar perfil");
      setClientUser(null);
    } finally {
      setClientLoading(false);
      setClientChecked(true);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    
    const loadingTimeout = setTimeout(() => {
      if (isMounted && authLoading) {
        console.warn("Client auth: Loading timeout reached");
        setAuthLoading(false);
        setClientChecked(true);
      }
    }, 10000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchClientUser(session.user.id);
        } else {
          setClientUser(null);
          setClientChecked(true);
          setError(null);
        }
        
        setAuthLoading(false);
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;
      
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await fetchClientUser(session.user.id);
      } else {
        setClientChecked(true);
      }
      
      setAuthLoading(false);
    });

    return () => {
      isMounted = false;
      clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, [fetchClientUser]);

  const signIn = async (email: string, password: string) => {
    setAuthLoading(true);
    setError(null);
    
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      setError(error.message);
      setAuthLoading(false);
      setClientChecked(true);
      return { error };
    }
    
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setClientUser(null);
    setClientChecked(false);
  };

  // Loading e TRUE se:
  // - Auth ainda esta a carregar OU
  // - Temos user mas client ainda esta a carregar
  const loading = authLoading || (!!user && clientLoading);
  
  // hasAuthButNoClient so e TRUE quando TUDO foi verificado
  const hasAuthButNoClient = !!user && !clientUser && !loading && clientChecked && !error;

  return {
    user,
    clientUser,
    loading,
    error,
    signIn,
    signOut,
    isAuthenticated: !!user && !!clientUser,
    hasAuthButNoClient,
  };
}
```

## Resultado Esperado

Apos as correcoes:

| Cenario | Antes | Depois |
|---------|-------|--------|
| Login cliente valido | Loading infinito ou erro | Acede ao dashboard |
| Utilizador CRM no portal cliente | Erro "Acesso Nao Autorizado" prematuro | Mensagem correcta apos verificacao |
| Timeout de rede | Loading infinito | Mensagem de timeout apos 10s |
| Refresh pagina login | Comportamento inconsistente | Redireciona correctamente |
