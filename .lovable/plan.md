

## Problema

A rota `/dashboard/prospecting` é referenciada na navegação (sidebar V1 e V2) e breadcrumbs, mas **não existe** no App.tsx. Só existem sub-rotas:
- `/dashboard/prospecting/google-local`
- `/dashboard/prospecting/web-search`
- `/dashboard/prospecting/professionals`

Quando o utilizador clica em "Prospecção" no menu, cai no 404.

## Solução

Criar uma página hub `/dashboard/prospecting` que serve como índice para os 3 módulos de prospecção existentes.

### Ficheiros a alterar

**1. Criar `src/pages/ProspectingHub.tsx`**

Página simples com 3 cards que linkam para cada módulo:
- Google Local Prospecting
- Web Search Prospecting  
- Professional Prospecting

Cada card com ícone, título, descrição curta e botão de acesso.

**2. Editar `src/App.tsx`**

Adicionar a rota:
```tsx
<Route path="/dashboard/prospecting" element={<ProspectingHub />} />
```

Antes das sub-rotas existentes.

**3. Adicionar à `routes.legacy.ts`**

Adicionar entrada para `/dashboard/prospecting` (para indexação no GlobalSearch).

