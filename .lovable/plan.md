

## Problema

As páginas **Clientes** (`/dashboard/c2c/clients`) e **Links Públicos** (`/dashboard/c2c/links`) não abrem porque as rotas nunca foram registadas no `App.tsx`. O path `/dashboard/c2c/:id` (detalhe de anúncio) captura "clients" como um ID de listing, resultando em "Anúncio não encontrado".

## Solução

1. **Adicionar imports** no `App.tsx` para `C2CClientsManagement` e `C2CPublicLinksManager`.

2. **Registar rotas específicas** antes da rota genérica `/:id`:
   - `/dashboard/c2c/clients` → `C2CClientsManagement`
   - `/dashboard/c2c/links` → `C2CPublicLinksManager`

   Estas rotas devem ficar **acima** de `/dashboard/c2c/:id` para que o React Router as resolva primeiro.

3. **Nenhuma alteração** nas páginas em si — o código já está funcional, apenas não estava acessível.

