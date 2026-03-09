

## Problema

A navegação V2 referencia `/dashboard/b2b-products`, mas essa rota não existe no `App.tsx`. O registry de extensões mapeia esta funcionalidade para `/dashboard/products` (`Products` page).

## Correção

Adicionar rota em `App.tsx`:

```tsx
<Route path="/dashboard/b2b-products" element={<Products />} />
```

### Ficheiro a alterar
- `src/App.tsx` — adicionar rota `/dashboard/b2b-products` apontando para o componente `Products`

