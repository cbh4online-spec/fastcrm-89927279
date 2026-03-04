

# Plano: Quote Intelligence Engine para RFQs

## Resumo

Criar um pipeline OCR + Parser + Matcher que permite importar cotações de fornecedores (PDF/imagem), extrair linhas com preços/qtds, fazer matching automático com rfq_items, e preencher a tabela de cotações via bulk upsert. Usa Lovable AI (Gemini 2.5 Flash) para OCR+parsing numa só chamada, e matching fuzzy/semântico.

---

## 1. Migração de Base de Dados

Duas novas tabelas:

```sql
CREATE TABLE public.rfq_quote_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id),
  rfq_id uuid NOT NULL REFERENCES public.rfqs(id),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id),
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL DEFAULT 'pdf',
  status text NOT NULL DEFAULT 'uploaded',
  totals_json jsonb DEFAULT '{}',
  meta_json jsonb DEFAULT '{}',
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.rfq_quote_import_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id),
  import_id uuid NOT NULL REFERENCES public.rfq_quote_imports(id) ON DELETE CASCADE,
  line_no int NOT NULL DEFAULT 0,
  raw_text text,
  description text,
  quantity numeric,
  unit_price numeric,
  line_total numeric,
  vat_percent numeric,
  discount_percent numeric,
  lead_time_days int,
  moq numeric,
  pack_size numeric,
  currency text DEFAULT 'EUR',
  computed_unit_price numeric,
  parse_confidence numeric DEFAULT 0,
  match_rfq_item_id uuid REFERENCES public.rfq_items(id),
  match_score numeric DEFAULT 0,
  match_method text DEFAULT 'none',
  match_status text DEFAULT 'unmatched',
  error_text text,
  normalized_json jsonb DEFAULT '{}'
);

-- Indices
CREATE INDEX idx_rqi_workspace_rfq ON public.rfq_quote_imports(workspace_id, rfq_id, supplier_id);
CREATE INDEX idx_rqil_import_status ON public.rfq_quote_import_lines(workspace_id, import_id, match_status);

-- RLS
ALTER TABLE public.rfq_quote_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfq_quote_import_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace members can manage rfq_quote_imports"
  ON public.rfq_quote_imports FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "workspace members can manage rfq_quote_import_lines"
  ON public.rfq_quote_import_lines FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
```

Storage: reutilizar bucket existente ou criar `rfq-quote-files` (privado).

---

## 2. Edge Functions (3 funções)

### A. `rfq-quote-ocr-parse` (OCR + Parse + Match numa chamada)

Combinar OCR, parsing e matching numa única edge function para simplificar:

1. Descarregar ficheiro do storage
2. Converter para base64
3. Enviar para Lovable AI (Gemini 2.5 Flash) com prompt de extração estruturada via **tool calling** que retorna array de linhas com description, qty, unit_price, line_total, vat_percent, etc.
4. Para cada linha extraida, fazer matching contra rfq_items:
   - Layer 1: SKU/EAN exact match
   - Layer 2: Fuzzy text (normalizado, lowercase, sem acentos, trigram-like scoring)
   - Layer 3: Se nenhum match forte, usar Lovable AI para semantic matching (batch de descrições vs rfq_items)
5. Inserir linhas em `rfq_quote_import_lines` com scores e status
6. Atualizar import status para `matched`

Input: `{ import_id }`
Output: `{ lines_count, matched, needs_review, unmatched }`

### B. `rfq-quote-update-match` (Correção manual)

Permite atualizar o match de uma linha individual.

Input: `{ line_id, rfq_item_id, match_method: "manual" }`

### C. `rfq-quote-apply` (Bulk upsert para rfq_quotes)

Pega nas linhas matched/manual e faz upsert em rfq_quotes usando o UNIQUE constraint existente.

Input: `{ import_id, mode: "draft"|"submitted" }`
Output: `{ created, updated, errors }`

---

## 3. UI: Wizard de 4 passos

### Componente: `RFQQuoteImportWizard.tsx`

Dialog/Drawer com stepper:

**Step 1 - Upload**
- Select fornecedor (dos convidados)
- File upload (PDF/JPG/PNG) para storage bucket
- Checkbox: "Documento contém preços unitários" / "Documento contém totais por linha"
- Botão "Processar"

**Step 2 - Processamento**
- Progress indicator: "A processar OCR... Parsing... Matching..."
- Invoca `rfq-quote-ocr-parse`
- Animação de loading

**Step 3 - Preview & Correções**
- Tabela com linhas extraidas:
  - Descrição (raw_text)
  - Qty, Unit Price, VAT, Line Total
  - Match sugerido + score + badge (Matched/Rever/Sem match)
  - Dropdown para corrigir match manualmente (pesquisa nos rfq_items)
  - Editar campos inline (qty, unit_price, vat)
- Resumo no topo: "X matched, Y para rever, Z sem match"
- Ações: "Auto-aplicar matches >= 0.90", "Marcar todos para revisão"

**Step 4 - Aplicar**
- Botão "Preencher Tabela de Cotação" (draft ou submitted)
- Invoca `rfq-quote-apply`
- Resumo: "X linhas importadas, Y atualizadas, Z erros"

### Hook: `useRFQQuoteImport.ts`

Encapsula:
- Upload de ficheiro para storage
- Criação do registo em `rfq_quote_imports`
- Chamada a `rfq-quote-ocr-parse`
- Chamada a `rfq-quote-update-match`
- Chamada a `rfq-quote-apply`
- Query das linhas importadas

---

## 4. Integração na RFQDetailPage

- Adicionar botão "Importar Cotação (PDF/OCR)" ao lado dos existentes
- State `showQuoteImport` para abrir o wizard
- Ícone FileText + Upload

---

## 5. Ficheiros a criar/modificar

| Ficheiro | Acao |
|---|---|
| Migração SQL | 2 tabelas + indices + RLS + storage bucket |
| `supabase/functions/rfq-quote-ocr-parse/index.ts` | Criar - OCR+Parse+Match via Gemini |
| `supabase/functions/rfq-quote-update-match/index.ts` | Criar - Correção manual |
| `supabase/functions/rfq-quote-apply/index.ts` | Criar - Bulk upsert |
| `src/hooks/useRFQQuoteImport.ts` | Criar |
| `src/components/procurement/RFQQuoteImportWizard.tsx` | Criar - UI wizard 4 passos |
| `src/pages/procurement/RFQDetailPage.tsx` | Modificar - botão + state |
| `supabase/config.toml` | Adicionar 3 funções com verify_jwt=false |

---

## 6. Segurança

- Todas as edge functions validam JWT e workspace membership
- RLS nas 2 tabelas novas scoped por workspace_id
- Storage bucket privado com RLS
- LOVABLE_API_KEY já disponível nos secrets

---

## 7. Estratégia de OCR/Parsing

Usar Gemini 2.5 Flash com vision (multimodal) para OCR+parsing numa chamada:
- Para PDFs: converter primeira(s) página(s) para imagem ou enviar como base64
- Tool calling para structured output (array de linhas)
- Prompt especializado para documentos comerciais PT/EU (vírgula decimal, €, IVA)
- parse_confidence baseado na completude dos campos extraidos

Matching: scoring aditivo (SKU exact = 1.0, fuzzy text > 0.7, semantic via AI > threshold 0.86). Colisões marcadas como needs_review.

