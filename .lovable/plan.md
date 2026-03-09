

## Problema

6 páginas de procurement não têm `<DashboardLayout>`, ficando sem sidebar:

1. `ProcurementProjectsPage.tsx`
2. `ProcurementProjectDetailPage.tsx`
3. `RFQsPage.tsx`
4. `RFQDetailPage.tsx`
5. `RFQsDashboardPage.tsx`
6. `SupplierPortalPage.tsx` (esta é portal externo, pode ser intencional)

## Correção

Envolver cada uma das 5 páginas internas com `<DashboardLayout>` (excluindo `SupplierPortalPage` que é um portal público para fornecedores).

Para cada ficheiro:
- Importar `DashboardLayout`
- Envolver o return JSX com `<DashboardLayout>...</DashboardLayout>`

### Ficheiros a alterar
- `src/pages/procurement/ProcurementProjectsPage.tsx`
- `src/pages/procurement/ProcurementProjectDetailPage.tsx`
- `src/pages/procurement/RFQsPage.tsx`
- `src/pages/procurement/RFQDetailPage.tsx`
- `src/pages/procurement/RFQsDashboardPage.tsx`

