

# Consolidar informação financeira no menu Financeiro

## Contexto actual

No detalhe de contacto, a tab **Financeiro** tem 3 subtabs: Pagamentos, Encomendas, Histórico. Mas o **Perfil Comercial** (categoria ABC, área de negócio) e a secção **Financeiro & Pagamentos** (condições de pagamento, crédito) estão escondidos dentro da tab **Dados > Informações**.

## Alterações

### `src/components/contacts/eni/ENIContactDetailWithSidebar.tsx`

1. **Adicionar subtab "Perfil" ao bloco `financial`** — nova subtab como primeira posição, contendo `CommercialProfileSection` e `FinancialSection` lado a lado (grid 2 colunas)

2. **Remover essas secções da tab `data > details`** — retirar `CommercialProfileSection` e `FinancialSection` do bloco de informações para evitar duplicação

Subtabs do Financeiro passam a ser:

```text
[ Perfil | Pagamentos | Encomendas | Histórico ]
```

- **Perfil**: CommercialProfileSection + FinancialSection (grid 1-2 cols)
- **Pagamentos**: AcquiredProductsSection + InvoiceHistorySection (sem alteração)
- **Encomendas**: ContactOrderNotesSection (sem alteração)
- **Histórico**: CommercialHistorySection (sem alteração)

| Ficheiro | Acção |
|----------|-------|
| `src/components/contacts/eni/ENIContactDetailWithSidebar.tsx` | Mover CommercialProfile + Financial para subtab "Perfil" no financial; remover do data |

