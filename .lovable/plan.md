

## Plano: Saldo de Créditos IA no Cabeçalho

### Objetivo
Adicionar um indicador de saldo de créditos IA ao lado do seletor de idioma (flag) no TopBar, com popup/dropdown para compra rápida de créditos.

### Implementação

**1. Novo componente `src/components/layout/TopBarCreditsBadge.tsx`**
- Reutiliza o hook `useCreditWallet` para obter o saldo
- Mostra um badge compacto com ícone de moeda + saldo numérico
- Cor muda para vermelho quando saldo ≤ 10
- Ao clicar, abre um **Popover** com:
  - Saldo atual em destaque
  - Lista dos pacotes de créditos disponíveis (via `useCreditPurchase`)
  - Botões "Comprar" que redirecionam para o Stripe checkout
- Tooltip no hover com "X créditos disponíveis"

**2. Integração no `TopBar.tsx`**
- Inserir `<TopBarCreditsBadge />` entre `<LanguageSelector />` e `<ContextScoreIndicator />` (linha 125-126)
- Importar o novo componente

### Componentes reutilizados
- `useCreditWallet` — saldo atual
- `useCreditPurchase` — pacotes e checkout Stripe
- Padrão visual inspirado no `CreditWalletBadge` existente, adaptado para popover com compra

