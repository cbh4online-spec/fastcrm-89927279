

# Limpeza Automática de HTML nas Descrições durante Importação

## Problema

Campos como `description`, `short_description`, `specifications` e `content` chegam com HTML bruto (`<p>`, `<ul>`, `<table>`, `<strong>`, etc.) do CSV. Este HTML é guardado tal como está na base de dados, tornando as descrições ilegíveis na interface.

## Solução

### 1. Criar função utilitária `stripHtmlToText`

**Ficheiro**: `src/components/products/BatchSKUImportDialog.tsx` (função local no topo)

```ts
function stripHtmlToText(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
}
```

Usa o `DOMParser` nativo do browser — sem dependências. Converte `<p>A Visiotech personaliza...</p>` → `A Visiotech personaliza...`, listas `<ul><li>` → texto corrido, tabelas → texto limpo.

### 2. Aplicar nos campos de texto no switch de mapeamento

**Ficheiro**: `src/components/products/BatchSKUImportDialog.tsx` (linhas 422-454)

Aplicar `stripHtmlToText` quando o valor contém `<` (para não processar texto limpo desnecessariamente):

- `case "description"` → `stripHtmlToText(val)`
- `case "short_description"` → `stripHtmlToText(val)`
- `case "name"` → `stripHtmlToText(val)` (caso tenha HTML no nome)
- `case "specifications"` → manter HTML original no campo specs (pode ser útil), mas adicionar versão limpa

A deteção é simples: `val.includes('<') ? stripHtmlToText(val) : val`

### 3. Também limpar SKUs (reforço)

Já existe lógica de deteção de SKUs inválidos, mas garantir que o `stripHtmlToText` também é aplicado ao SKU durante o mapeamento para remover `<td>`, `<strong>`, etc.

## Ficheiros Modificados
- `src/components/products/BatchSKUImportDialog.tsx` — adicionar `stripHtmlToText` e aplicar nos campos de texto

