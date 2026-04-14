

# Implementar Tab Financeiro Completo na Empresa

## Diagnóstico

A tab "Financeiro" na página de detalhe da empresa cai no `default` do switch (`Secção em desenvolvimento`) porque não existe `case 'financial'` no `CompanyDetailWithSidebar.tsx`. Todos os componentes necessários já existem — apenas falta a orquestração.

## Componentes Existentes a Reutilizar

| Componente | Função |
|---|---|
| `FinancialKPIStrip` | KPIs: Total Faturado, Pago, Pendente, Vencido |
| `FinancialSection` | Condições pagamento, método preferido, crédito |
| `CommercialHistorySection` | Vendas por ano, ABC, ticket médio, última compra |
| `CompanyContactsHistory` | Revenue breakdown por contacto da empresa |
| `CompanyOrderNotesSection` | Encomendas B2B da empresa |
| `AcquiredProductsSection` | Produtos adquiridos (via faturas) |
| `InvoiceHistorySection` | Lista de faturas com estado |

## Plano

### Ficheiro: `src/components/companies/CompanyDetailWithSidebar.tsx`

Adicionar `case 'financial'` no switch com a estrutura:

```
case 'financial':
  return (
    <div className="space-y-4">
      <FinancialKPIStrip entityType="company" entityId={id!} />
      <EntitySubTabs
        tabs={[
          { id: 'profile', label: 'Perfil' },
          { id: 'payments', label: 'Pagamentos' },
          { id: 'orders', label: 'Encomendas' },
          { id: 'history', label: 'Histórico' },
        ]}
      >
        {(tab) => {
          switch (tab) {
            case 'profile':
              // FinancialSection (condições pagamento/crédito)
            case 'payments':
              // AcquiredProductsSection + InvoiceHistorySection
            case 'orders':
              // CompanyOrderNotesSection
            case 'history':
              // CommercialHistorySection + CompanyContactsHistory
          }
        }}
      </EntitySubTabs>
    </div>
  );
```

**Sub-tabs:**

1. **Perfil** — `FinancialSection` (condições de pagamento, crédito, método preferido)
2. **Pagamentos** — `AcquiredProductsSection` (produtos) + `InvoiceHistorySection` (faturas) em grid 2 colunas
3. **Encomendas** — `CompanyOrderNotesSection` (encomendas B2B)
4. **Histórico** — `CommercialHistorySection` (vendas anuais, ABC) + `CompanyContactsHistory` (revenue por contacto)

### Imports Adicionais Necessários

- `AcquiredProductsSection` de `@/components/shared/AcquiredProductsSection`
- `InvoiceHistorySection` de `@/components/contacts/eni/sections/InvoiceHistorySection`
- `CommercialHistorySection` já importada? Verificar. Se não, importar de `./sections/CommercialHistorySection`
- `CompanyContactsHistory` de `./sections/CompanyContactsHistory`
- `CompanyOrderNotesSection` de `./sections/CompanyOrderNotesSection`

### Critérios de Aceitação

- Tab "Financeiro" mostra KPIs no topo (Total Faturado, Pago, Pendente, Vencido)
- Sub-tabs funcionais com dados reais
- Scroll funcional em toda a secção
- Sem regressões nas outras tabs

