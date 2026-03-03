

# Export RFQ to PDF

## What
Add an "Exportar PDF" button next to the "Enviar RFQ" button on the RFQ detail page. The PDF will contain the RFQ title, status, due date, list of invited suppliers, and a table of items (product, SKU, quantity).

## How

### File: `src/pages/procurement/RFQDetailPage.tsx`

1. Import `jsPDF` and `FileDown` icon
2. Add `handleExportPDF` function that:
   - Creates a jsPDF document
   - Renders RFQ header (title, status, due date)
   - Lists invited suppliers
   - Renders items table (Produto, SKU, Quantidade)
   - Saves as `RFQ-{title}.pdf`
3. Add "Exportar PDF" button in the top-right actions area (next to existing buttons), visible in all statuses

### PDF Content Layout
- **Header**: RFQ title + status + due date
- **Section 1**: Fornecedores convidados (list)
- **Section 2**: Items table with columns: Produto, SKU, Quantidade
- Uses jsPDF text positioning (no external dependencies needed — jsPDF is already installed)

### Single file change
- `src/pages/procurement/RFQDetailPage.tsx`

