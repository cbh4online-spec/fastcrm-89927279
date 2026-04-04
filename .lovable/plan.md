## Fase 6 — Importação Avançada, Drag-to-Reorder, Variantes & Lifecycle ✅

### 1. Importação avançada de produtos ✅
**Ficheiro:** `src/components/products/ProductImportWizard.tsx` (novo)
- Wizard multi-step: Upload → Mapeamento → Preview → Importação → Resultado
- Suporte CSV e Excel (.xlsx) via papaparse + exceljs
- Auto-detecção de colunas (nome, preço, sku, categoria, etc.)
- Validação com erros por linha e resumo pré-confirmação
- Inserção em batch de 100 com progress bar

### 2. Drag-to-reorder colunas ✅
**Ficheiro:** `src/components/common/ColumnSelector.tsx` (já existia)
- Drag-and-drop nativo já implementado com handles visuais
- Botão "Reset" agora reseta ordem + visibilidade + larguras
- Prop `onResetWidths` passada para resetar larguras via `useColumnWidths`

### 3. Variantes de produto ✅ (já existia)
- Tabela `product_variants` já existente no DB
- `ProductVariantsManager.tsx` já completo com CRUD inline

### 4. Workflow de aprovação/lifecycle ✅ (já existia)
- `ProductLifecycleTab.tsx` já completo com workflow visual
- Estados: Rascunho → Em Revisão → Ativo → Descontinuado → Arquivado
- Changelog e notificações automáticas integrados
