

# Consolidar informação financeira na página de Empresa

## Situação actual

Na empresa, a `FinancialSection` está no `overview`, e `payments`, `orders`, `history` são cases separados no switch. Não há agrupamento financeiro com subtabs como nos contactos.

## Alterações em `src/components/companies/CompanyDetailWithSidebar.tsx`

1. **Importar `EntitySubTabs`** e `CommercialHistorySection` (já importado)

2. **Adicionar case `'financial'`** com `EntitySubTabs` contendo 4 subtabs:
   - **Perfil**: `FinancialSection` (condições pagamento, crédito)
   - **Pagamentos**: `AcquiredProductsSection`
   - **Encomendas**: `CompanyOrderNotesSection`
   - **Histórico**: `CommercialHistorySection`

3. **Remover `FinancialSection` do case `'overview'`** — fica apenas `IdentificationSection` + scores + lifecycle

4. **Remover cases individuais** `'payments'`, `'orders'`, `'history'` — ficam consolidados dentro do `'financial'`

| Ficheiro | Acção |
|----------|-------|
| `CompanyDetailWithSidebar.tsx` | Importar EntitySubTabs; criar case financial com subtabs; remover FinancialSection do overview; remover cases payments/orders/history |

