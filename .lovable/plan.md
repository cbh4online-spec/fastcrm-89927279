
# Plano: Corrigir Interface de Itens da Proposta

## Problemas Identificados

Após análise dos logs, network requests e código, foram identificados os seguintes problemas:

| Problema | Causa | Impacto |
|----------|-------|---------|
| Produtos não aparecem | A query de produtos pode não estar a executar devido ao workspace não estar disponível no momento da montagem | Não é possível adicionar produtos |
| Warning de Badge ref | O componente Badge não implementa forwardRef | Warning na consola (não bloqueia funcionalidade) |
| Categorias podem não aparecer | Depende da query de produtos funcionar primeiro | Filtros não funcionais |

## Análise Técnica

### 1. Query de Produtos Não Executada

No `useProducts` hook (linha 78):
```typescript
enabled: !!currentWorkspace?.id
```

Se o `currentWorkspace` não estiver disponível quando o componente monta, a query não executa. Isto pode acontecer porque:
- O `POSProposalItemsEditor` está dentro de um Dialog que monta antes do contexto estar pronto
- A navegação directa para `/dashboard/proposals/:id` pode não ter o workspace carregado

### 2. Badge Sem forwardRef

O componente `Badge` (linha 25-27 de badge.tsx):
```typescript
function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
```

Não usa `forwardRef`, causando o warning quando usado em contextos que passam refs (como dentro de Tooltips ou ScrollArea).

### 3. Filtros de Categoria

Os botões de categoria funcionam correctamente (`onClick={() => setCategoryFilter(cat)}`), mas só aparecem se a query `useProductCategories` retornar dados. Esta query também depende do workspace.

## Solução Proposta

### Fase 1: Corrigir Badge Component

Adicionar `forwardRef` ao componente Badge para eliminar o warning e garantir compatibilidade com todos os contextos:

```typescript
const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => {
    return <div ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />;
  }
);
Badge.displayName = "Badge";
```

### Fase 2: Garantir Disponibilidade do Workspace

O `POSProposalItemsEditor` já usa `useProducts` que depende do workspace. Precisamos garantir que:
1. O componente espera pelo workspace antes de renderizar
2. Adicionar estado de loading enquanto o workspace não está disponível

No `POSProductSelector`, adicionar verificação:
```typescript
const { currentWorkspace } = useWorkspace();

// Se não há workspace, mostrar loading ou estado vazio adequado
if (!currentWorkspace?.id) {
  return <LoadingState />;
}
```

### Fase 3: Melhorar Feedback Visual

Adicionar indicadores visuais claros quando:
- Produtos estão a carregar
- Não há categorias disponíveis
- Filtros estão activos

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/ui/badge.tsx` | Adicionar `forwardRef` |
| `src/components/proposals/POSProductSelector.tsx` | Adicionar verificação de workspace e melhorar loading states |
| `src/components/proposals/ProductCard.tsx` | Remover ref implícito do Badge (se necessário) |

## Implementação Detalhada

### 1. Badge com forwardRef

```typescript
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => {
    return <div ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />;
  }
);
Badge.displayName = "Badge";

export { Badge, badgeVariants };
```

### 2. POSProductSelector com Verificação de Workspace

Adicionar importação e verificação:

```typescript
import { useWorkspace } from "@/contexts/WorkspaceContext";

export function POSProductSelector({ ... }) {
  const { currentWorkspace } = useWorkspace();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const { data: products, isLoading: isLoadingProducts } = useProducts({
    status: "active",
    productType: typeFilter !== "all" ? typeFilter : undefined,
    search: search || undefined,
  });

  const { data: categories, isLoading: isLoadingCategories } = useProductCategories();

  // Verificar se workspace está disponível
  if (!currentWorkspace?.id) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-3" />
        <p className="text-muted-foreground">A carregar...</p>
      </div>
    );
  }

  // ... resto do componente
}
```

### 3. Melhorar Feedback de Categorias

Se as categorias estão a carregar ou vazias:

```typescript
{/* Category Filters */}
{isLoadingCategories ? (
  <div className="flex gap-1.5 mb-4">
    {Array.from({ length: 4 }).map((_, i) => (
      <Skeleton key={i} className="h-6 w-20 rounded-full" />
    ))}
  </div>
) : categories && categories.length > 0 ? (
  <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
    {/* ... botões de categoria ... */}
  </div>
) : null}
```

## Resultado Esperado

Após implementação:

1. **Sem warnings na consola** - Badge suporta refs correctamente
2. **Produtos aparecem** - Verificação explícita do workspace antes de renderizar
3. **Categorias funcionais** - Feedback visual durante loading
4. **Quantidades editáveis** - Os controlos de quantidade já funcionam no ProposalCart/POSProposalItemsEditor

## Complexidade

Baixa - Modificar 2-3 ficheiros com alterações pequenas e focadas.
