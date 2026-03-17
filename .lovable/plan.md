

## Plano: Melhorar fluxo "Começar a Vender" e ativar cards informativos

### Problema 1 — Botão "Começar a Vender"
Quando o vendedor já está aprovado, ao clicar "Começar a Vender" é levado para `/marketplace/:slug/sell` que mostra o ecrã "Estado da Candidatura" com status aprovado — em vez de ir diretamente para criar um anúncio. O fluxo correto para vendedores aprovados deve ser redirecioná-los para a criação de listagem.

### Problema 2 — Cards informativos não são interativos
Os 4 cards do hero ("Compra Segura", "Comunidade Ativa", "Sem Taxas p/ Comprador", "Publicação Rápida") são estáticos e não mostram informação adicional ao clicar.

### Solução

**Ficheiro 1: `src/pages/c2c/C2CSellerRegistration.tsx`**
- Quando `sellerProfile.status === "approved"`, redirecionar automaticamente para a página de criação de anúncio (`/marketplace/:slug/create`) em vez de mostrar o ecrã estático
- Manter o ecrã "Estado da Candidatura" apenas para status `pending`, `rejected` e `suspended`

**Ficheiro 2: `src/pages/c2c/C2CPublicMarketplace.tsx`**
- Tornar os 4 cards do hero clicáveis com dialogs/modais que mostram informação expandida sobre cada benefício:
  - **Compra Segura**: Explicação do sistema de escrow, pagamentos protegidos via Stripe, garantia de reembolso
  - **Comunidade Ativa**: Informação sobre vendedores verificados, sistema de ratings e badges
  - **Sem Taxas p/ Comprador**: Clarificação de que apenas o vendedor paga 5% de comissão
  - **Publicação Rápida**: Passos para publicar (fotos → descrição → preço → publicar em 2 min)
- Usar um Dialog/Sheet do shadcn para mostrar a informação ao clicar em cada card

### Resultado
- Vendedores aprovados vão direto para criar anúncio
- Visitantes obtêm informação detalhada sobre os benefícios ao interagir com os cards

