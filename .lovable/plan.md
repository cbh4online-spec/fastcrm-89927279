

## Problema

A página `SupplierPriceImportPage` não tem o wrapper `<DashboardLayout>`, ao contrário de todas as outras páginas de procurement. Por isso não mostra a sidebar.

## Correção

Envolver o conteúdo de `src/pages/procurement/SupplierPriceImportPage.tsx` com `<DashboardLayout>`:

```tsx
import { DashboardLayout } from "@/components/layout/DashboardLayout";

const SupplierPriceImportPage = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6 p-6 max-w-5xl mx-auto">
        ...
      </div>
    </DashboardLayout>
  );
};
```

### Ficheiro a alterar
- `src/pages/procurement/SupplierPriceImportPage.tsx` — adicionar DashboardLayout

