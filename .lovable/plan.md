

# Expandir Auto-Mapping do Preço de Custo no Importador de SKUs

## Diagnóstico

O importador já tem o campo `cost_price` como campo de sistema e já o persiste como `direct_cost` na base de dados (linha 688). O auto-mapping existe (linha 169) mas o regex é restritivo:

```
/^(cost|custo|cost.?price|preço.?custo|precio.?coste|prix.?achat)$/i
```

**Problemas identificados:**
- `.?` só aceita 0-1 caracteres → "preço de custo" (com "de") não faz match
- Falta: `custo_direto`, `direct_cost`, `purchase_price`, `preço_compra`, `unit_cost`, `custo_unitário`, `buying_price`, `net_cost`, `wholesale_price`
- Headers com espaços ou underscores compostos falham

## Alteração

| Ficheiro | Acção |
|---|---|
| `src/components/products/BatchSKUImportDialog.tsx` | Expandir o regex do `cost_price` no `AUTO_MAP_PATTERNS` |

### Detalhe

Substituir o regex da linha 169 por um padrão mais abrangente:

```typescript
[/^(cost|custo|cost.?price|preço.?(de.?)?custo|custo.?dire[tc]o|direct.?cost|purchase.?price|preço.?(de.?)?compra|precio.?(de.?)?coste|prix.?(d.?)?achat|unit.?cost|custo.?unit[aá]rio|buying.?price|net.?cost|wholesale.?price|p\.?c\.?)$/i, "cost_price"],
```

Variantes cobertas: `custo`, `custo direto`, `direct_cost`, `preço de custo`, `purchase price`, `preço de compra`, `unit cost`, `custo unitário`, `buying price`, `net cost`, `wholesale price`, `P.C.` (abreviatura comum em tabelas de fornecedores).

