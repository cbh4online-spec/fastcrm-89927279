

# Corrigir Filtragem de SKUs com HTML no Import em Lote

## Diagnóstico

O parser de importação (linhas 406-415 do `BatchSKUImportDialog.tsx`) faz `sku.replace(/<[^>]*>/g, "")` para limpar tags HTML, mas o texto resultante (ex: "Western Digital", "Marca", "Capacidade", "SATA 6 Gb/s") passa os filtros e é tratado como SKU válido. O heurístico `looksDescriptive` é demasiado limitado — só apanha padrões como "265 g" ou palavras específicas hardcoded.

O problema raiz: quando o CSV vem de um scrape de página web, as células contêm fragmentos de HTML (`<li>`, `<td>`, `<strong>`) que não são dados de produto — são markup de layout.

## Solução

Reforçar a filtragem de SKUs em duas camadas:

### 1. Rejeitar valores que vieram de tags HTML estruturais (`BatchSKUImportDialog.tsx`)

Antes de limpar o HTML, verificar se o valor original continha tags estruturais (`<td>`, `<th>`, `<li>`, `<tr>`, `<table>`, `<strong>` sozinho). Se sim, marcar como suspeito e aplicar validação extra.

### 2. Melhorar heurístico `looksDescriptive` 

Expandir o filtro para rejeitar valores que:
- Contenham apenas palavras comuns em português/inglês (ex: "Marca", "Unidades", "Capacidade", "Interface", "Resolução", "Compatível")
- Sejam nomes genéricos de marcas/atributos sem formato de SKU (sem números, sem hífens, sem padrão alfanumérico)
- Tenham origem em tags `<td>`, `<th>`, `<li>` — indicando que são labels de tabela HTML, não dados de produto

### 3. Adicionar flag visual para itens suspeitos

Na tabela de resultados, itens que passaram por limpeza HTML pesada mostram um badge "⚠ Verificar" para o utilizador poder desmarcar manualmente.

## Alterações

| Ficheiro | Acção |
|---|---|
| `src/components/products/BatchSKUImportDialog.tsx` | Reforçar filtragem de SKUs na função `confirmMapping` (linhas 405-416): adicionar detecção de tags estruturais HTML, expandir lista de palavras descritivas comuns, adicionar badge visual de alerta |

### Detalhe técnico

**Novo filtro (antes da linha 408):**
- Guardar se o valor original tinha tags HTML estruturais: `const hadHtmlTags = /<(td|th|li|tr|strong|em|b)\b/i.test(rawSku)`
- Se `hadHtmlTags` e o texto limpo não tem formato de SKU (sem dígitos, sem hífens, sem underscores, < 3 caracteres alfanuméricos), rejeitar

**Heurístico expandido:**
- Lista de stop-words: "marca", "unidades", "capacidade", "interface", "resolução", "compatível", "iluminação", "cor", "material", "peso", "dimensões", "garantia", "tipo", "modelo", "descrição", "preço", "stock", "categoria"
- Rejeitar se o SKU limpo (lowercase) é exactamente uma stop-word
- Rejeitar se o SKU limpo só tem espaços e letras sem nenhum dígito/hífen e veio de tag HTML

**Badge visual:**
- Itens que passaram mas tinham HTML recebem propriedade `suspicious: true`
- Na tabela de resultados, mostrar badge amber "Verificar" ao lado do SKU

