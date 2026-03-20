

# Importação de Produtos via URL com Confirmação Coluna a Coluna

## Problema

O utilizador quer colar o URL da Visiotech diretamente no diálogo de importação de produtos, descarregar o CSV, ver **todas as colunas** numa tabela tipo Excel, e selecionar manualmente quais colunas mapear para campos do sistema antes de criar os produtos.

## Alterações

### 1. Nova tab "Importar por URL" no BatchSKUImportDialog

**Ficheiro**: `src/components/products/BatchSKUImportDialog.tsx`

Adicionar uma terceira tab no `phase === "input"`:
- **"Importar por URL"** com ícone Link
- Campo de URL (pré-preenchido com o URL Visiotech como placeholder)
- Botão "Descarregar e Analisar"
- Ao clicar: usa uma edge function para descarregar o CSV (evitar CORS), parse as colunas, e mostra na tabela

### 2. Edge Function: `csv-url-fetch`

**Criar**: `supabase/functions/csv-url-fetch/index.ts`

Função simples que:
- Recebe `{ url: string, delimiter?: string, encoding?: string, max_rows?: number }`
- Descarrega o CSV do URL (timeout 60s)
- Detecta delimitador automaticamente se não especificado
- Devolve `{ headers: string[], rows: string[][], total_rows: number }` (máximo 500 rows no preview)
- Necessário porque o browser não pode fazer fetch direto ao URL da Visiotech (CORS)

### 3. Step de Mapeamento de Colunas (novo phase)

**Ficheiro**: `src/components/products/BatchSKUImportDialog.tsx`

Adicionar um novo phase `"mapping"` entre o download e o processamento:
- Mostra **todas as colunas** do CSV numa lista
- Cada coluna tem:
  - Checkbox "Incluir" (on/off)
  - Dropdown para mapear a um campo do sistema: SKU, Nome, Descrição, Preço, Categoria, Marca, Código de barras, Stock, Peso, Imagem URL, ou "Dados extra"
- Auto-detecção inteligente: tenta mapear automaticamente colunas com nomes comuns (sku, name, price, etc.)
- Preview: mostra os primeiros 3 valores de cada coluna para ajudar na decisão
- Botão "Confirmar Mapeamento → Importar"

### 4. Integração com o fluxo existente

Após confirmar o mapeamento:
- As colunas mapeadas alimentam os campos do sistema (Nome, Preço, Categoria, etc.)
- As colunas incluídas mas não mapeadas ficam em `rawRow` como dados extra visíveis na tabela
- O fluxo segue para o phase `"processing"` existente (pesquisa IA opcional) ou directamente para `"results"`
- O utilizador pode optar por saltar a pesquisa IA e criar directamente com os dados do CSV

### 5. Alteração ao phase flow

```text
input → [URL download] → mapping → processing/results → summary
         (ou CSV/paste)
```

No phase `"mapping"`:
- Tabela com scroll horizontal mostrando TODAS as colunas
- Header com checkboxes + dropdowns de mapeamento
- 5 sample rows para preview dos dados
- Botão "Criar directamente (sem IA)" — usa os dados CSV tal como estão
- Botão "Enriquecer com IA" — processa SKUs pela IA como hoje

## Ficheiros Modificados
- `src/components/products/BatchSKUImportDialog.tsx` — nova tab URL + phase mapping
- `supabase/functions/csv-url-fetch/index.ts` — nova edge function (proxy CORS)

