
# Corrigir Responsividade Mobile — Zona Hero e Secções Verticais

## Causa raiz do problema (screenshot analisada)

O texto e o layout estão a ser cortados horizontalmente porque:

1. **`DashboardMockup`** tem uma sidebar fixa de `w-[140px]` e um kanban em `flex` sem `overflow-hidden` — em mobile, este componente tem largura superior ao viewport, causando scroll horizontal mesmo com `overflow-x-hidden` no wrapper (porque o mockup usa largura absoluta interna).

2. **`VerticalHero`** — `py-24` (96px) em mobile + header de 64px = o conteúdo começa aos 160px. Com o Badge, título de 3+ linhas e parágrafo, os CTAs ficam fora do viewport inicial.

3. **`VerticalTransformation`** — usa `px-6` sem breakpoint (`sm:px-6`), o que em viewports muito estreitos é menos grave mas inconsistente.

4. **`VerticalCTAForm`** — formulário com `p-8` (32px) em mobile. Com `max-w-2xl`, o conteúdo útil fica com 390 - 32 - 32 - 32 = ~294px, muito estreito para os campos `grid sm:grid-cols-2`.

## Ficheiros a alterar

| Ficheiro | Problema | Solução |
|----------|----------|---------|
| `VerticalHero.tsx` | `py-24` excessivo; mockup visível em mobile causando overflow | `py-12 sm:py-20 lg:py-32`; ocultar mockup em mobile (`hidden sm:block`) |
| `DashboardMockup.tsx` | Sidebar fixa `w-[140px]` e kanban sem contenção em mobile | Adicionar `overflow-hidden` ao contentor raiz; sidebar `w-[100px] sm:w-[140px]`; ocultar sidebar em mobile |
| `VerticalTransformation.tsx` | `px-6` sem responsive | `px-4 sm:px-6` |
| `VerticalCTAForm.tsx` | `p-8` no formulário sem responsive | `p-5 sm:p-8` |

## Detalhes técnicos por ficheiro

### 1. `VerticalHero.tsx` — Ocultar mockup em mobile + reduzir padding

O DashboardMockup em mobile (390px) tem sidebar 140px + 4 colunas kanban em flex → mínimo ~500px de largura. Mesmo com `overflow-hidden` no section, o elemento interno força reflow.

**Solução**: Ocultar o bloco do mockup em mobile com `hidden sm:block`:

```tsx
// Antes:
<motion.div className="mt-16 lg:mt-24 max-w-5xl mx-auto">
  <div className="relative rounded-xl overflow-hidden ...">
    <DashboardMockup config={config} />
  </div>
</motion.div>

// Depois:
<div className="hidden sm:block mt-12 lg:mt-24 max-w-5xl mx-auto">
  <div className="relative rounded-xl overflow-hidden ...">
    <DashboardMockup config={config} />
  </div>
</div>
```

E reduzir `py-24` para `py-12 sm:py-20 lg:py-32` e `space-y-8` para `space-y-6 sm:space-y-8` no contentor interno.

### 2. `DashboardMockup.tsx` — Sidebar adaptável

Mesmo em tablets (sm), a sidebar de 140px é pesada. Tornar a sidebar mais estreita e condicional:

```tsx
// Sidebar: w-[140px] → w-[110px] sm:w-[140px]
// Conteúdo interno do sidebar: ocultar items de módulos em viewports mais pequenos
```

Adicionalmente, adicionar `overflow-hidden` ao contentor raiz do mockup para garantir que nada escapa:

```tsx
<div className="w-full select-none pointer-events-none overflow-hidden">
```

### 3. `VerticalTransformation.tsx` — Padding responsivo

```tsx
// Antes:
<div className="max-w-5xl mx-auto px-6">

// Depois:
<div className="max-w-5xl mx-auto px-4 sm:px-6">
```

### 4. `VerticalCTAForm.tsx` — Padding do formulário

```tsx
// Antes:
className="rounded-2xl border border-[hsl(217,33%,17%)] bg-[hsl(222,47%,6%)] p-8 space-y-5"

// Depois:
className="rounded-2xl border border-[hsl(217,33%,17%)] bg-[hsl(222,47%,6%)] p-5 sm:p-8 space-y-5"
```

## Resultado esperado

- **Mobile (390px)**: Hero com Badge + título compacto + parágrafo + 2 CTAs todos visíveis sem scroll; sem overflow horizontal
- **Tablet (768px+)**: Dashboard mockup aparece normalmente
- **Desktop**: Sem alterações visuais
