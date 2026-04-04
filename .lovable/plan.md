## Fase 6 — Importação Avançada, Drag-to-Reorder, Variantes & Workflow de Aprovação

### 1. Importação avançada de produtos
**Ficheiro:** `src/components/products/ProductImportWizard.tsx` (novo)

- Wizard multi-step: Upload → Preview → Mapeamento de colunas → Validação → Confirmação
- Suporte a CSV e Excel (xlsx) via `exceljs` + `papaparse`
- Preview dos primeiros 10 registos com highlighting de erros
- Auto-detecção de colunas (nome, preço, sku, categoria)
- Resumo pré-confirmação: total, novos, erros, warnings
- Validação: campos obrigatórios, formato de preço, SKU duplicados
- Inserção em batch com progress bar

### 2. Drag-to-reorder colunas
**Ficheiro:** `src/components/common/ColumnSelector.tsx` (refactor)

- Adicionar drag handles com `@dnd-kit/sortable` (já instalado)
- Reordenar colunas via drag-and-drop no seletor
- Botão "Repor predefinições" que reseta ordem + visibilidade + larguras
- Persistir ordem em localStorage (já parcialmente implementado)

### 3. Variantes de produto
**Tabela:** `product_variants` (nova migração)
**Ficheiro:** `src/components/products/ProductVariantsManager.tsx` (existe, refactor)

- Tabela `product_variants` com: product_id, variant_name, variant_value, sku, price_override, stock_quantity, sort_order
- UI: tabela editável inline no detalhe do produto
- Adicionar/remover variantes (ex: Cor → Azul, Vermelho; Tamanho → S, M, L)
- Preço override por variante (herda do produto-pai se vazio)
- RLS: workspace_id scope

### 4. Workflow de aprovação/lifecycle
**Ficheiros:** Refactor `useProductLifecycle.ts` + novo `ProductLifecyclePanel.tsx`

- Painel visual de workflow no detalhe do produto
- Estados: Rascunho → Em Revisão → Ativo → Descontinuado → Arquivado
- Transições controladas com validação (ex: não pode publicar sem preço)
- Notificação automática ao submeter para revisão (já existe via `admin_notifications`)
- Timeline de transições de estado integrada com o changelog existente
- Badges de estado coloridos na tabela principal

### Ordem de execução
1. Drag-to-reorder colunas (mais simples, UX imediato)
2. Importação avançada (valor alto, complexidade média)
3. Variantes de produto (requer migração DB)
4. Workflow de aprovação (integração com lifecycle existente)

### Ficheiros a alterar/criar
- `src/components/common/ColumnSelector.tsx` — drag-to-reorder + reset
- `src/components/products/ProductImportWizard.tsx` (novo)
- `src/components/products/ProductVariantsManager.tsx` (refactor)
- `src/components/products/ProductLifecyclePanel.tsx` (novo)
- `src/components/products/ProductDetailDialog.tsx` — integrar variantes + lifecycle
- `src/components/products/ProductsList.tsx` — integrar import wizard
- `src/hooks/useProductLifecycle.ts` — adicionar validações de transição
- Migração: tabela `product_variants` com RLS