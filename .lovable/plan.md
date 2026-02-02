
# Plano: Corrigir Filtros de Produtos no POS da Proposta

## Problema Identificado

Os filtros de tipo de produto (Serviços, Formações, Programas, etc.) e os filtros de categoria **não estão a funcionar** porque:

| Componente | Problema |
|------------|----------|
| Filtros de Tipo | Usam códigos hardcoded incorrectos (`service`, `training`) que não existem na base de dados |
| Filtros de Categoria | O componente `ProductCard` está a causar warning de ref que pode afetar o scroll |

### Códigos na Base de Dados vs. Códigos no UI

| Na BD (product_types) | No POSProductSelector | Match? |
|-----------------------|----------------------|--------|
| `simple` | - | N/A |
| `recurring` | - | N/A |
| `sessions` | - | N/A |
| `composite` | - | N/A |
| `formacao` | `training` | **Não** |
| `programa` | `program` | **Não** |
| `physical` | `physical` | Sim |
| `servico` (alguns produtos) | `service` | **Não** |
| - | `consulting` | **Não existe** |
| - | `digital` | **Não existe** |

### Arquitectura Correcta

O `ProductsList.tsx` já usa **`useProductTypes()`** para obter os tipos de produto configuráveis dinamicamente da tabela `product_types`. O `POSProductSelector` deve seguir o mesmo padrão.

## Solução

### 1. Usar Configuração Dinâmica

Substituir os filtros hardcoded por tipos carregados dinamicamente do hook `useProductTypes()`:

```typescript
// Antes (incorrecto - hardcoded)
const productTypeFilters = [
  { value: "service", label: "Serviços", icon: Briefcase },
  ...
];

// Depois (correcto - dinâmico)
const { data: productTypesConfig } = useProductTypes();
// Usar productTypesConfig para renderizar os filtros
```

### 2. Mapear Ícones Dinamicamente

Criar mapeamento de ícones baseado no campo `icon` da configuração:

```typescript
const iconMap: Record<string, React.ElementType> = {
  Package: Package,
  Repeat: Repeat,
  Clock: Clock,
  Layers: Layers,
  GraduationCap: BookOpen, // ou criar import
  Boxes: Users,
  Box: Package,
};
```

### 3. Melhorar Feedback Visual

- Mostrar skeletons enquanto os tipos carregam
- Indicar visualmente o filtro activo
- Manter scroll horizontal funcional nas categorias

### 4. Corrigir ProductCard (forwardRef)

Adicionar `forwardRef` ao `ProductCard` para eliminar o warning quando usado dentro do ScrollArea.

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/proposals/POSProductSelector.tsx` | Usar `useProductTypes()` em vez de tipos hardcoded |
| `src/components/proposals/ProductCard.tsx` | Adicionar `forwardRef` |

## Implementação Detalhada

### POSProductSelector.tsx

```typescript
import { useProductTypes } from "@/hooks/useProductSettings";
import * as LucideIcons from "lucide-react";

export function POSProductSelector({ ... }) {
  const { currentWorkspace } = useWorkspace();
  const { data: productTypesConfig, isLoading: isLoadingTypes } = useProductTypes();
  
  // ... restante do código
  
  // Mapeamento de ícones dinâmico
  const getIcon = (iconName: string) => {
    const icons: Record<string, React.ElementType> = {
      Package: LucideIcons.Package,
      Repeat: LucideIcons.Repeat,
      Clock: LucideIcons.Clock,
      Layers: LucideIcons.Layers,
      GraduationCap: LucideIcons.GraduationCap,
      Boxes: LucideIcons.Boxes,
      Box: LucideIcons.Box,
      // ... outros ícones necessários
    };
    return icons[iconName] || LucideIcons.Package;
  };
  
  return (
    <div className="flex flex-col h-full">
      {/* Type Filters - Dinâmico */}
      <div className="flex gap-1.5 mb-3 flex-wrap">
        <Button
          variant={typeFilter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setTypeFilter("all")}
        >
          <Grid3X3 className="h-3 w-3" />
          Todos
        </Button>
        
        {isLoadingTypes ? (
          // Skeleton para loading
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-20" />
          ))
        ) : (
          productTypesConfig?.filter(t => t.is_active).map((type) => {
            const Icon = getIcon(type.icon);
            return (
              <Button
                key={type.id}
                variant={typeFilter === type.code ? "default" : "outline"}
                size="sm"
                onClick={() => setTypeFilter(type.code)}
              >
                <Icon className="h-3 w-3" />
                {type.label}
              </Button>
            );
          })
        )}
      </div>
      
      {/* ... resto do componente */}
    </div>
  );
}
```

### ProductCard.tsx

```typescript
import * as React from "react";

const ProductCard = React.forwardRef<HTMLDivElement, ProductCardProps>(
  ({ product, isSelected, onClick }, ref) => {
    // ... implementação existente
    return (
      <Card ref={ref} onClick={onClick} className={...}>
        ...
      </Card>
    );
  }
);
ProductCard.displayName = "ProductCard";

export { ProductCard };
```

## Fluxo Resultante

```text
┌─────────────────────────────────────────────────────────────────┐
│ 🔍 Pesquisar produtos...                                       │
├─────────────────────────────────────────────────────────────────┤
│ [Todos] [Simples] [Recorrente] [Sessões] [Bundle] [Formação]   │
│                  [Programa] [Produto Físico] [Dia] [Hora] ...  │
│                                                                 │
│ Carregados dinamicamente da tabela product_types!              │
├─────────────────────────────────────────────────────────────────┤
│ [Todas Categorias] [Serviços Técnicos] [Manutenção] [...]      │
│                                                                 │
│ Filtram correctamente os produtos!                             │
├─────────────────────────────────────────────────────────────────┤
│                        Produtos Grid                            │
└─────────────────────────────────────────────────────────────────┘
```

## Benefícios

1. **Consistência** - Usa a mesma fonte de dados que o `ProductsList`
2. **Configurável** - Novos tipos adicionados no admin aparecem automaticamente
3. **Sem Erros** - Códigos corretos que existem na BD
4. **UX Melhorada** - Loading states e feedback visual

## Complexidade

Baixa - Modificar 2 ficheiros seguindo padrões já existentes no projecto.
