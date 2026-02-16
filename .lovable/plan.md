

# Restaurar Landing Pages na secao de Funis

## Problema

Quando o sistema de Funis foi criado, o item "Landing Pages" foi removido do menu lateral e substituido apenas por "Funis". O modulo de Landing Pages deixou de estar acessivel.

## Solucao

Adicionar o item "Landing Pages" de volta ao menu lateral, ao lado de "Funis", dentro do mesmo grupo de Marketing. Ambos os modulos ficam disponiveis:

- **Funis** -> `/dashboard/funnels` (sistema novo de funis multi-step)
- **Landing Pages** -> `/dashboard/landing-pages` (sistema existente de landing pages)

## Alteracoes

### 1. `src/components/layout/Sidebar.tsx`

Adicionar o item "Landing Pages" no grupo de Marketing, logo apos o item "Funis":

```
{ name: "Funis", href: "/dashboard/funnels", icon: Globe, tooltip: "Funis de conversao" },
{ name: "Landing Pages", href: "/dashboard/landing-pages", icon: FileEdit, tooltip: "Paginas de captura" },
```

### 2. `src/App.tsx`

Restaurar a rota `/dashboard/landing-pages` para apontar para o componente `LandingPages` em vez de `Funnels`:

```
Antes:  <Route path="/dashboard/landing-pages" element={<Funnels />} />
Depois: <Route path="/dashboard/landing-pages" element={<LandingPages />} />
```

Garantir que o import de `LandingPages` esta presente no ficheiro.

