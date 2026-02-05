
# Plano: Corrigir Erro de Login no Portal B2B

## Problema Identificado

O utilizador `jorge.cardoso@digital4ads.pt` tem **2 registos** na tabela `client_users`:

| workspace_id | workspace_name | status |
|--------------|----------------|--------|
| d9e3d0ae-5893-41e9-97f3-7d7ce6a06f0f | METODOPARE | active |
| 0662fc16-6286-4156-a908-08c7dfec0fb7 | PHARLISS | active |

Quando o hook `useClientAuth` executa:
```typescript
await supabase
  .from("client_users")
  .select("*")
  .eq("auth_user_id", userId)
  .in("status", ["active", "pending"])
  .maybeSingle();  // ERRO: retorna mais de 1 resultado!
```

O método `.maybeSingle()` falha quando há mais de um resultado, causando o erro "Erro ao carregar perfil de cliente".

## Solução

O sistema já gera URLs com o parâmetro `?workspace=slug`:
```
/client/login?workspace=metodopare
/client/login?workspace=pharliss
```

Mas esse parâmetro **não está a ser utilizado** para filtrar o cliente correcto.

### Fluxo Corrigido

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  URL: /client/login?workspace=metodopare                               │
│                              │                                          │
│                              ▼                                          │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  ClientLoginPage extrai workspace slug da URL                      │ │
│  │  useSearchParams() → slug = "metodopare"                           │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                              │                                          │
│                              ▼                                          │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  Busca workspace_id pelo slug                                      │ │
│  │  SELECT id FROM workspaces WHERE slug = 'metodopare'              │ │
│  │  → workspace_id = d9e3d0ae-5893-...                               │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                              │                                          │
│                              ▼                                          │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  useClientAuth recebe workspaceId como parâmetro                   │ │
│  │  Filtra: .eq("workspace_id", workspaceId)                         │ │
│  │  Agora .maybeSingle() retorna 1 resultado ou null                 │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                              │                                          │
│                              ▼                                          │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  Login bem sucedido - utilizador acede ao Portal do METODOPARE    │ │
│  └───────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

## Alterações de Código

### Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/hooks/client-portal/useClientAuth.ts` | Aceitar `workspaceId` como parâmetro opcional e filtrar a query |
| `src/pages/client/ClientLoginPage.tsx` | Extrair `workspace` slug da URL, resolver para `workspace_id`, e passar ao hook |
| `src/components/client-portal/ClientLayout.tsx` | Propagar o contexto de workspace através de localStorage ou URL |

### Detalhes Técnicos

#### 1. useClientAuth.ts - Aceitar workspaceId

```typescript
interface UseClientAuthConfig {
  workspaceId?: string;
}

export function useClientAuth(config?: UseClientAuthConfig): UseClientAuthReturn {
  // ...
  
  const fetchClientUser = useCallback(async (userId: string) => {
    let query = supabase
      .from("client_users")
      .select("*")
      .eq("auth_user_id", userId)
      .in("status", ["active", "pending"]);
    
    // Se workspaceId foi fornecido, filtrar por ele
    if (config?.workspaceId) {
      query = query.eq("workspace_id", config.workspaceId);
    }
    
    const { data, error } = await query.maybeSingle();
    // ...
  }, [config?.workspaceId]);
}
```

#### 2. ClientLoginPage.tsx - Resolver workspace slug

```typescript
import { useSearchParams } from "react-router-dom";

export default function ClientLoginPage() {
  const [searchParams] = useSearchParams();
  const workspaceSlug = searchParams.get("workspace");
  const [workspaceId, setWorkspaceId] = useState<string | undefined>();
  
  // Resolver slug para workspace_id
  useEffect(() => {
    if (!workspaceSlug) return;
    
    const resolveWorkspace = async () => {
      const { data } = await supabase
        .from("workspaces")
        .select("id")
        .eq("slug", workspaceSlug)
        .single();
      
      if (data) {
        setWorkspaceId(data.id);
        // Guardar em localStorage para manter contexto após login
        localStorage.setItem("client_workspace_id", data.id);
      }
    };
    
    resolveWorkspace();
  }, [workspaceSlug]);
  
  // Passar workspaceId ao hook
  const { signIn, ... } = useClientAuth({ workspaceId });
  // ...
}
```

#### 3. ClientLayout.tsx - Usar workspace do localStorage

```typescript
export function ClientLayout({ children }: ClientLayoutProps) {
  const savedWorkspaceId = localStorage.getItem("client_workspace_id");
  const { clientUser, ... } = useClientAuth({ 
    workspaceId: savedWorkspaceId || undefined 
  });
  // ...
}
```

## Fallback para URLs Sem Workspace

Se o utilizador aceder a `/client/login` sem o parâmetro `?workspace=`:
1. A query retornará o primeiro `client_user` encontrado (usando `.limit(1)` em vez de `.maybeSingle()`)
2. Ou mostrará uma mensagem pedindo para usar o link de acesso fornecido pelo administrador

## Benefícios

1. **Multi-tenancy correcto** - Cada cliente acede apenas ao portal do seu workspace
2. **Sem erros de duplicados** - A query nunca retornará múltiplos resultados
3. **Contexto persistente** - O workspace é guardado em localStorage para navegação subsequente
4. **Retrocompatibilidade** - URLs antigas continuam a funcionar (com fallback)
