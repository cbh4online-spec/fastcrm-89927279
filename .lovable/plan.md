
# Corrigir rota /dashboard/b2b-stock (404)

## Problema

A pagina `/dashboard/b2b-stock` da 404 porque a rota nao esta registada no `App.tsx`. O componente `B2BStockPage.tsx` existe mas nunca foi adicionado ao router.

## Solucao

Adicionar a rota em `src/App.tsx`:

1. Importar o componente `B2BStockPage` no topo do ficheiro
2. Adicionar `<Route path="/dashboard/b2b-stock" element={<B2BStockPage />} />` junto das outras rotas do Portal B2B (depois da linha 487, junto de `b2b-portal`)

## Ficheiro a alterar

| Ficheiro | Accao |
|---|---|
| `src/App.tsx` | Adicionar import + rota para B2BStockPage |
