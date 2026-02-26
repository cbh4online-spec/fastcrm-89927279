

# Implementar KPIs Financeiros no topo da tab Financeiro

## Alterações

### 1. Novo hook `src/hooks/useFinancialKPIs.ts`
Query à tabela `invoices` filtrada por `contact_id` ou `company_id` (excluindo draft), calculando no cliente:
- **Total Faturado**: soma de todos os `total`
- **Pago**: soma onde `status` = 'paid'
- **Pendente**: soma onde `status` = 'unpaid' ou 'sent'
- **Vencido**: soma onde `status` = 'overdue'

### 2. Novo componente `src/components/shared/FinancialKPIStrip.tsx`
Usa `KPIGrid` (4 colunas) + `KPICard` do design system (`src/components/design-system/KPICard.tsx`):
- Total Faturado — variant: primary, ícone `Euro`
- Pago — variant: success, ícone `CheckCircle`
- Pendente — variant: warning, ícone `Clock`
- Vencido — variant: destructive, ícone `AlertTriangle`

Props: `entityType: 'contact' | 'company'`, `entityId: string`

Valores formatados com `formatCurrency` de `src/lib/formatters.ts`.

### 3. Integrar nos dois ficheiros

- **`ENIContactDetailWithSidebar.tsx`** (linha 327): renderizar `<FinancialKPIStrip entityType="contact" entityId={id!} />` antes do `<EntitySubTabs>` dentro do case `'financial'`, wrapping ambos num `<div className="space-y-4">`

- **`CompanyDetailWithSidebar.tsx`** (linha 295): renderizar `<FinancialKPIStrip entityType="company" entityId={id!} />` antes do `<EntitySubTabs>` dentro do case `'financial'`, wrapping ambos num `<div className="space-y-4">`

| Ficheiro | Acção |
|----------|-------|
| `src/hooks/useFinancialKPIs.ts` | Criar hook com query a invoices |
| `src/components/shared/FinancialKPIStrip.tsx` | Criar strip com 4 KPICards |
| `ENIContactDetailWithSidebar.tsx` | Adicionar strip acima de EntitySubTabs |
| `CompanyDetailWithSidebar.tsx` | Adicionar strip acima de EntitySubTabs |

