
# Plano: Aplicar Logótipo do Workspace em Toda a Aplicação

## Objectivo
Substituir os ícones genéricos (Building2, "FC") pelo logótipo personalizado do workspace em todos os locais relevantes, criando uma experiência de marca consistente e profissional.

## Análise Actual

### Locais que Usam Ícones Genéricos (a substituir)

| Local | Componente | Ícone Actual | Prioridade |
|-------|------------|--------------|------------|
| Sidebar Header | `Sidebar.tsx` | Building2 + "FastCRM" | Alta |
| Workspace Switcher | `WorkspaceSwitcher.tsx` | Building2/Shield | Alta |
| Portal Cliente Header | `ClientLayout.tsx` | "FC" badge | Alta |
| Portal Cliente Footer | `ClientLayout.tsx` | Texto "FastCRM" | Média |

### Locais que Já Usam logo_url (OK)
- Propostas comerciais (`ProposalClientDocument.tsx`) - Já usa `workspace.logo_url`
- Configurações de Fatura (`useInvoiceSettings.ts`) - Já tem `company_logo_url`

## Arquitectura da Solução

### 1. Expandir WorkspaceContext para Incluir logo_url

O `WorkspaceContext` actual não inclui `logo_url`. Precisamos expandir a interface e fetch para incluir esta informação.

```typescript
// WorkspaceContext.tsx
export interface Workspace {
  id: string;
  name: string;
  slug: string;
  role: WorkspaceRole;
  created_at: string;
  isAgencyManaged?: boolean;
  logo_url?: string | null;  // NOVO
}
```

### 2. Criar Componente WorkspaceLogo Reutilizável

Componente inteligente que mostra o logo do workspace ou fallback para ícone/iniciais.

```typescript
// src/components/workspace/WorkspaceLogo.tsx
interface WorkspaceLogoProps {
  logoUrl?: string | null;
  workspaceName: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  variant?: "default" | "sidebar" | "portal";
}

// Renderiza:
// - Imagem se logo_url existir
// - Iniciais do workspace como fallback
// - Ícone Building2 se não houver nome
```

### 3. Aplicar em Cada Local

#### Sidebar Header (Alta Prioridade)
```
┌─────────────────────────────────────┐
│ [LOGO] Nome do Workspace            │
│                      ← substituir   │
│ Building2 + "FastCRM" por logo      │
└─────────────────────────────────────┘
```

#### Workspace Switcher (Alta Prioridade)
```
┌──────────────────────────────────────┐
│ [LOGO] Empresa XYZ           ▼      │
│        owner                        │
└──────────────────────────────────────┘
```

#### Portal Cliente (Alta Prioridade)
```
┌──────────────────────────────────────┐
│ [LOGO] Portal Cliente    [Nav...]   │
│   ↑ substituir "FC" badge           │
└──────────────────────────────────────┘
```

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/contexts/WorkspaceContext.tsx` | Adicionar `logo_url` à interface e fetch |
| `src/components/workspace/WorkspaceLogo.tsx` | **CRIAR** - Componente reutilizável |
| `src/components/layout/Sidebar.tsx` | Usar WorkspaceLogo no header |
| `src/components/layout/WorkspaceSwitcher.tsx` | Usar WorkspaceLogo nos items |
| `src/components/client-portal/ClientLayout.tsx` | Mostrar logo do workspace do cliente |

## Implementação Detalhada

### Passo 1: Expandir WorkspaceContext

Modificar o fetch para incluir `logo_url`:

```sql
.select("id, name, slug, created_at, logo_url")
```

E mapear nos objectos Workspace.

### Passo 2: Criar WorkspaceLogo Component

```tsx
export function WorkspaceLogo({ 
  logoUrl, 
  workspaceName, 
  size = "md",
  variant = "default" 
}: WorkspaceLogoProps) {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8", 
    lg: "w-10 h-10"
  };
  
  const initials = workspaceName
    ?.split(" ")
    .map(w => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "WS";

  if (logoUrl) {
    return (
      <img 
        src={logoUrl} 
        alt={workspaceName}
        className={cn(sizeClasses[size], "rounded-lg object-contain")}
      />
    );
  }

  // Fallback: Iniciais com cor do gradient
  return (
    <div className={cn(
      sizeClasses[size],
      "rounded-lg flex items-center justify-center",
      variant === "sidebar" 
        ? "bg-gradient-to-br from-primary to-violet-600"
        : "bg-primary/10"
    )}>
      <span className={cn(
        "font-bold",
        variant === "sidebar" ? "text-white" : "text-primary",
        size === "sm" ? "text-[10px]" : "text-xs"
      )}>
        {initials}
      </span>
    </div>
  );
}
```

### Passo 3: Actualizar Sidebar

No header da Sidebar, substituir:

```tsx
// ANTES
<div className="w-9 h-9 rounded-xl bg-gradient-to-br...">
  <Building2 className="w-5 h-5 text-white" />
</div>
<span>FastCRM</span>

// DEPOIS
<WorkspaceLogo 
  logoUrl={currentWorkspace?.logo_url}
  workspaceName={currentWorkspace?.name || "FastCRM"}
  size="md"
  variant="sidebar"
/>
<span>{currentWorkspace?.name || "FastCRM"}</span>
```

### Passo 4: Actualizar WorkspaceSwitcher

Em cada item do dropdown e no trigger:

```tsx
<WorkspaceLogo 
  logoUrl={workspace.logo_url}
  workspaceName={workspace.name}
  size="sm"
/>
```

### Passo 5: Portal Cliente

O Portal Cliente precisa carregar o logo do workspace associado ao cliente. Modificar `ClientLayout.tsx` para:

```tsx
// Carregar workspace_logo via hook existente ou query
<WorkspaceLogo 
  logoUrl={workspaceLogo}
  workspaceName={workspaceName || "Portal"}
  size="md"
/>
```

## Comportamento de Fallback

```text
┌─────────────────────────────────────────────────────┐
│ Prioridade de Renderização:                         │
│                                                     │
│ 1. logo_url existe → Mostrar imagem                 │
│ 2. Nome existe → Mostrar iniciais (ex: "MP")        │
│ 3. Nenhum → Mostrar ícone Building2                 │
└─────────────────────────────────────────────────────┘
```

## Resultado Esperado

Após implementação:

1. **Sidebar** - Mostra logo do workspace actual (ou iniciais como fallback)
2. **Workspace Switcher** - Cada workspace mostra o seu logo na lista
3. **Portal Cliente** - Mostra o logo do workspace/empresa do cliente
4. **Consistência** - Todos os locais usam o mesmo componente `WorkspaceLogo`

## Benefícios

- **Identidade de Marca**: Cada workspace tem a sua marca visível
- **Profissionalismo**: Clientes vêem o logo da empresa em vez de ícones genéricos
- **Consistência**: Um único componente para toda a aplicação
- **Fallback Elegante**: Iniciais coloridas quando não há logo

## Complexidade

Média - Requer modificar context, criar componente e actualizar 4 ficheiros
