

# Adicionar Ícone de Puzzle nos Itens de Módulo

## Alteração

Adicionar um mini ícone `Puzzle` (3×3) ao lado do nome nos itens que têm `moduleSlug`, para distinguir visualmente dos itens core.

### `src/components/layout/SidebarV1.tsx`

1. No render expandido dos `visibleNavItems` (linha ~253), após `<span className="flex-1">{item.name}</span>`, adicionar condicionalmente:
```tsx
{item.moduleSlug && <Puzzle className="w-3 h-3 text-muted-foreground/50" />}
```

2. No tooltip do modo colapsado (linha ~238), adicionar o ícone de puzzle ao texto do tooltip:
```tsx
<TooltipContent side="right">
  {item.name}{item.moduleSlug && " (módulo)"}
</TooltipContent>
```

3. Nos favoritos expandidos (linha ~197), mesmo padrão — adicionar puzzle após o nome se `item.moduleSlug` existe.

O ícone `Puzzle` já está importado no ficheiro (linha 6).

### Ficheiro a alterar

| Ficheiro | Acção |
|---|---|
| `src/components/layout/SidebarV1.tsx` | Adicionar `<Puzzle>` condicional em 3 pontos de renderização |

