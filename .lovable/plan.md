

# Instalar Batch 5 + Batch 6 + Substituir xlsx por exceljs

## Resumo
Instalar o editor Tiptap (7 packages), utilitários nice-to-have (2 packages), e substituir `xlsx` por `exceljs` em 8 ficheiros frontend + 2 edge functions.

## Alterações ao package.json

### Adicionar (Batch 5 — Tiptap)
- `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/pm`
- `@tiptap/extension-placeholder`, `@tiptap/extension-link`, `@tiptap/extension-image`, `@tiptap/extension-table`

### Adicionar (Batch 6 — Utilities)
- `react-countup`, `nanoid`

### Substituir (Segurança)
- Remover `xlsx` (2 vulnerabilidades high-severity)
- Adicionar `exceljs` (^4.4.0)

## Migração xlsx → exceljs (8 ficheiros frontend)

Todos os ficheiros usam o padrão `import * as XLSX from "xlsx"` com `XLSX.read()`, `XLSX.utils.sheet_to_json()`, `XLSX.utils.book_new()`, `XLSX.utils.json_to_sheet()`, `XLSX.writeFile()`.

Ficheiros a migrar:
1. `src/components/student-journey/ImportProfilesDialog.tsx`
2. `src/components/student-journey/BulkEnrollmentDialog.tsx`
3. `src/components/imports/ImportWizard.tsx`
4. `src/components/imports/SmartImportWizard.tsx`
5. `src/components/procurement/SupplierImportModal.tsx`
6. `src/components/procurement/CatalogBulkPriceModal.tsx`
7. `src/components/opportunities/DealsImportExportMenu.tsx`
8. `src/types/studentJourney.ts` (apenas tipo literal, sem alteração funcional)

### Padrão de migração

```text
ANTES (xlsx):
  import * as XLSX from "xlsx";
  const wb = XLSX.read(data, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json(ws);
  // export:
  const ws2 = XLSX.utils.json_to_sheet(data);
  const wb2 = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb2, ws2, "Sheet1");
  XLSX.writeFile(wb2, "file.xlsx");

DEPOIS (exceljs):
  import ExcelJS from "exceljs";
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(arrayBuffer);
  const ws = wb.worksheets[0];
  const json = []; // iterar ws.eachRow()
  // export:
  const wb2 = new ExcelJS.Workbook();
  const ws2 = wb2.addWorksheet("Sheet1");
  ws2.columns = [...]; ws2.addRows(data);
  const buffer = await wb2.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), "file.xlsx");
```

## Edge Functions (2 ficheiros)
- `supabase/functions/supplier-import-validate/index.ts`
- `supabase/functions/supplier-import-parse/index.ts`

Estas usam `npm:xlsx@0.18.5` (import map do Deno). Serão migradas para `npm:exceljs@4.4.0` com o mesmo padrão async.

## Critérios de aceitação
- Build sem erros
- Zero referências a `xlsx` no projecto
- Imports e exports de Excel continuam funcionais
- Edge functions deployam sem erro

