

# Plano: Remover itens e adicionar referência do fornecedor na Tabela de Cotação

## Resumo

Duas funcionalidades na `RFQQuoteSheetDialog`:

1. **Remover linhas** — permitir excluir itens que o fornecedor não cotou (apenas no UI local; ao guardar, só envia as linhas restantes)
2. **Referência do fornecedor** — nova coluna editável "Ref. Fornecedor" para registar o código/referência do fornecedor (diferente do SKU interno)

## Alterações

### 1. Base de dados

Adicionar coluna `supplier_ref` à tabela `rfq_quotes`:

```sql
ALTER TABLE public.rfq_quotes ADD COLUMN IF NOT EXISTS supplier_ref text;
```

### 2. Frontend — `QuoteSheetRow` type (`useRFQQuoteSheet.ts`)

- Adicionar `supplier_ref: string` ao interface `QuoteSheetRow`
- Adicionar `excluded: boolean` (campo local, não persistido) para controlo de remoção

### 3. Frontend — `RFQQuoteSheetDialog.tsx`

**Remover itens:**
- Adicionar coluna com botão X (ícone Trash/X) em cada linha
- Ao clicar, marca a linha como `excluded: true` (não a remove do array, para permitir desfazer)
- Linhas excluídas ficam com estilo riscado/opaco + botão "Restaurar"
- No `handleSaveDraft` e `handleSubmit`, filtrar linhas com `excluded !== true`
- Contagem de itens atualizada: "X de Y itens"

**Referência do fornecedor:**
- Nova coluna editável "Ref. Forn." entre SKU e Qtd
- Input de texto (não numérico)
- Incluído no save/submit como `supplier_ref`
- Adicionado ao `EDITABLE_FIELDS` ou tratado separadamente (texto vs número)

### 4. Edge Functions

**`rfq-upsert-quote-sheet`** — aceitar `supplier_ref` no payload e incluir no insert/update.

**`rfq-get-supplier-quote-sheet`** — retornar `supplier_ref` existente nas linhas.

### 5. Ficheiros a modificar

| Ficheiro | Alteração |
|---|---|
| Migração SQL | `ALTER TABLE rfq_quotes ADD COLUMN supplier_ref` |
| `src/hooks/useRFQQuoteSheet.ts` | Adicionar `supplier_ref` e `excluded` ao type |
| `src/components/procurement/RFQQuoteSheetDialog.tsx` | Coluna Ref. Forn. + botão remover/restaurar + filtrar excluídos no save |
| `supabase/functions/rfq-upsert-quote-sheet/index.ts` | Aceitar e persistir `supplier_ref` |
| `supabase/functions/rfq-get-supplier-quote-sheet/index.ts` | Retornar `supplier_ref` |

