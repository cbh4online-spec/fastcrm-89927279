

## Fundo de Tema Completo — Correcção

### Diagnóstico

Ao alternar entre tema claro e escuro, o fundo não muda de forma total. Isto acontece porque:

1. O elemento `html` não tem `bg-background` — apenas o `body` o tem, deixando gaps visíveis em scroll overflows e áreas fora do viewport
2. O `main` content area no `DashboardLayout` não tem `bg-background` explícito — herda do pai, mas em certas situações de scroll/overflow pode mostrar o fundo original
3. A TopBar usa `bg-background/80` (80% opacidade com backdrop-blur), o que em transições de tema pode parecer inconsistente

### Alterações

| Ficheiro | Alteração |
|----------|-----------|
| `src/index.css` | Adicionar `html { @apply bg-background; }` para garantir que todo o viewport tem a cor correcta, mesmo em overscroll |
| `src/components/layout/DashboardLayout.tsx` | Adicionar `bg-background` ao `main` element (linha 66) para reforçar o fundo na área de conteúdo |
| `src/components/layout/TopBar.tsx` | Alterar `bg-background/80` para `bg-background` na header (linha 60) para eliminar transparência parcial |

### Detalhe técnico

**`src/index.css`** — Dentro de `@layer base`, o bloco `html` actual só tem `scroll-smooth`. Adicionar `bg-background` garante que o fundo do documento inteiro acompanha o tema:

```css
html {
  @apply scroll-smooth bg-background;
}
```

**`DashboardLayout.tsx`** — A `main` tag na linha 66 passa de:
```
<main className="flex-1 animate-fade-in p-4 md:p-6 overflow-auto">
```
para:
```
<main className="flex-1 animate-fade-in p-4 md:p-6 overflow-auto bg-background">
```

**`TopBar.tsx`** — A header na linha 60 passa de `bg-background/80 backdrop-blur-xl` para `bg-background backdrop-blur-none` (fundo sólido, sem transparência).

### Critérios de aceitação
1. Ao alternar entre tema claro e escuro, todo o ecrã muda de cor — sem áreas parciais ou transparentes
2. Overscroll (bounce em mobile/macOS) mostra a cor correcta do tema
3. Sem regressão visual nos componentes existentes

