

# Adicionar KPIs financeiros no topo da tab Financeiro

## Dados disponíveis

A tabela `invoices` contém: `status` (paid/unpaid/overdue/draft/sent), `total`, `due_date`, `contact_id`, `company_id`. Podemos calcular KPIs directamente a partir desta tabela.

## Alterações

### 1. Novo hook `src/hooks/useFinancialKPIs.ts`

Query à tabela `invoices` filtrada por `contact_id` ou `company_id`, calculando:
- **Total Faturado**: soma de `total` de todas as faturas (excluindo draft)
- **Pendente**: soma de `total` onde `status` = 'unpaid' ou 'sent'
- **Vencido**: soma de `total` onde `status` = 'overdue' ou (`status` != 'paid' e `due_date` < hoje)
- **Pago**: soma de `total` onde `status` = 'paid'
- **Nr. Faturas**: contagem total
- **Taxa de Cobrança**: pago / faturado em percentagem

### 2. Novo componente `src/components/shared/FinancialKPIStrip.tsx`

Usa `KPIGrid` + `KPICard` do design system existente com 4-6 cards:
- Total Faturado (variant: primary, ícone Euro)
- Pago (variant: success, ícone CheckCircle)
- Pendente (variant: warning, ícone Clock)
- Vencido (variant: destructive, ícone AlertTriangle)

### 3. Integrar nos dois ficheiros

- **`ENIContactDetailWithSidebar.tsx`**: renderizar `<FinancialKPIStrip entityType="contact" entityId={id} />` acima do `EntitySubTabs` no case `'financial'`
- **`CompanyDetailWithSidebar.tsx`**: renderizar `<FinancialKPIStrip entityType="company" entityId={id} />` acima do `EntitySubTabs` no case `'financial'`

| Ficheiro | Acção |
|----------|-------|
| `src/hooks/useFinancialKPIs.ts` | Criar hook que agrega dados de invoices |
| `src/components/shared/FinancialKPIStrip.tsx` | Criar strip de KPIs financeiros |
| `ENIContactDetailWithSidebar.tsx` | Adicionar FinancialKPIStrip no topo do case financial |
| `CompanyDetailWithSidebar.tsx` | Adicionar FinancialKPIStrip no topo do case financial |

