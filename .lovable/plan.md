

# Programa de Fidelidade / Pontos

## Resumo

Criar um sistema de pontos de fidelidade onde clientes acumulam pontos por compras na loja e podem troca-los por descontos em futuras encomendas. Inclui painel admin para configuracao e painel do cliente para consulta de saldo.

---

## Como funciona

```text
  Compra concluida (paid)
        |
        v
  Trigger SQL calcula pontos (1 ponto por cada 1 EUR gasto)
        |
        v
  Credita pontos na tabela loyalty_points_transactions
        |
        v
  Cliente ve saldo na area da conta da loja
        |
        v
  No checkout, pode usar pontos como desconto (ex: 100 pts = 1 EUR)
```

---

## O que sera criado

### 1. Tabelas na base de dados

**`loyalty_settings`** -- configuracao por workspace
- `workspace_id`, `points_per_euro` (default 1), `points_value_cents` (valor de cada ponto em centimos, default 1), `is_active`, `min_redeem_points` (minimo para trocar, default 100)

**`loyalty_points_transactions`** -- historico de movimentos
- `workspace_id`, `user_id`, `order_id` (nullable), `points`, `type` (earned | redeemed | expired | adjusted), `description`, `balance_after`, `created_at`

**Trigger SQL** -- apos `store_orders.status` mudar para `paid`, calcular e creditar pontos automaticamente

### 2. Hook `useStoreLoyalty.ts`

- `useLoyaltySettings(workspaceId)` -- configuracao do programa
- `useLoyaltyBalance(userId, workspaceId)` -- saldo atual
- `useLoyaltyHistory(userId, workspaceId)` -- historico de transacoes
- `useRedeemPoints()` -- trocar pontos por desconto (cria um cupao temporario)

### 3. Painel Admin -- `StoreLoyaltyManager.tsx`

Integrado nas configuracoes da loja (novo separador "Fidelidade"):
- Ativar/desativar programa
- Configurar taxa de pontos (pontos por EUR gasto)
- Configurar valor de resgate (centimos por ponto)
- Minimo de pontos para resgate
- Ver top clientes por pontos

### 4. Area do Cliente -- `StoreLoyaltyWidget.tsx`

Na pagina de produto e no header da loja:
- Badge com saldo de pontos atual
- Indicacao de quantos pontos ganha com a compra
- Link para historico completo

### 5. Pagina de Historico -- `StoreLoyaltyPage.tsx`

Nova rota `/store/:workspaceSlug/loyalty`:
- Saldo total
- Tabela de movimentos (ganhos, resgates, ajustes)
- Botao para resgatar pontos (gera cupao de desconto)

### 6. Integracao no Checkout

- No formulario de checkout, se o cliente tem pontos suficientes, mostrar opcao "Usar pontos"
- Ao usar, invocar funcao que cria um cupao temporario de uso unico com o valor equivalente
- Registar transacao de resgate

---

## Seccao Tecnica

### Ficheiros a criar
- `src/hooks/useStoreLoyalty.ts` -- hooks de dados do programa
- `src/components/store-settings/StoreLoyaltyManager.tsx` -- painel admin
- `src/components/store/StoreLoyaltyWidget.tsx` -- widget de pontos na loja
- `src/pages/store/StoreLoyaltyPage.tsx` -- pagina de historico do cliente

### Ficheiros a modificar
- `src/pages/StoreSettingsPage.tsx` -- adicionar separador "Fidelidade"
- `src/pages/store/StoreProductPage.tsx` -- mostrar pontos que o produto ganha
- `src/components/store/StoreHeader.tsx` -- badge de pontos no header
- `src/App.tsx` -- nova rota `/store/:workspaceSlug/loyalty`
- `src/components/store/StoreFooter.tsx` -- link para pagina de fidelidade
- `supabase/functions/create-store-checkout/index.ts` -- aplicar resgate de pontos e creditar apos pagamento

### Migracao SQL
- Criar tabelas `loyalty_settings` e `loyalty_points_transactions`
- RLS: leitura publica para settings (apenas `is_active`), leitura/escrita restrita por user_id para transactions
- Trigger em `store_orders` para creditar pontos quando status muda para `paid`
- Funcao SQL `get_loyalty_balance(user_id, workspace_id)` para calcular saldo

### Dependencias
- Nenhuma nova -- utiliza componentes UI e hooks existentes

