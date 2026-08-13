# Corrigir 404 em /dashboard/checkout-admin

## Diagnóstico

O menu lateral IX (secção Faturação) inclui a entrada `checkout-admin`, definida em `routeManifest.ts` com o caminho `/dashboard/checkout-admin`. Esse caminho não existe: em `CheckoutRoutes.tsx` as rotas reais começam em `/dashboard/checkout`. Resultado: clicar em "Admin Checkout" mostra a página 404.

Existe ainda uma segunda entrada no manifesto, `checkout` → `/dashboard/checkout`, que aponta para a página correta mas não é usada na navegação IX — ou seja, há duas entradas para o mesmo módulo, uma delas partida.

## Correção

- Apontar a entrada `checkout-admin` para `/dashboard/checkout` e renomeá-la para "Funis de Checkout" (nome que corresponde ao ecrã real).
- Remover a entrada duplicada `checkout` do manifesto, ou mantê-la apenas se estiver referida noutro menu — a verificar antes de apagar, para não partir outra navegação.
- Confirmar que a visibilidade de menus por workspace (`menuOverrides` / `MenuVisibilityGuard`) continua a resolver a chave usada.

## Estrutura técnica

- `src/config/routeManifest.ts` (linhas 292-293) — corrigir href e label; eliminar duplicado.
- `src/config/navigation/ixNavigation.ts` — mantém `{ key: "checkout-admin" }`, sem alteração se a chave for preservada.

Sem alterações de base de dados nem de lógica de negócio.

## Critérios de aceitação

- O item de menu abre a listagem de Funis de Checkout, sem 404.
- Não aparecem dois itens de checkout no mesmo menu.
- Restantes sub-rotas (Ofertas, Abandonados, Bundles, Descontos, A/B, Analytics) continuam acessíveis.
- Consola sem erros.
