

# Preenchimento em Massa do Preço de Custo

## Contexto

A `ProductsList` já tem selecção múltipla com checkboxes e acções em massa (Exportar, Arquivar, Apagar). Falta apenas adicionar a acção de definir custo direto em massa.

## Alterações

| Ficheiro | Acção |
|---|---|
| `src/components/products/BulkCostDialog.tsx` | **Novo** — Dialog modal para inserir o preço de custo a aplicar aos produtos seleccionados |
| `src/components/products/ProductsList.tsx` | Adicionar botão "Definir Custo" na barra de acções em massa + estado e lógica |

### Detalhe

1. **`BulkCostDialog.tsx`** — Componente novo:
   - Dialog com input numérico para o valor do custo direto (€)
   - Mostrar quantos produtos serão afectados
   - Botão "Aplicar" que executa `supabase.from("products").update({ direct_cost: valor }).in("id", selectedIds)`
   - Invalidar query `["products"]` após sucesso
   - Toast de confirmação com contagem

2. **`ProductsList.tsx`** — Na barra de bulk actions (linha ~955-997):
   - Novo estado `bulkCostOpen`
   - Botão com ícone `DollarSign` e label "Definir Custo" entre Exportar e Arquivar
   - Renderizar `<BulkCostDialog>` com props: `open`, `onOpenChange`, `selectedIds`, `onComplete` (limpa selecção + refetch)

### UX
- Input com prefixo "€", tipo number, step 0.01
- Indicação clara: "Aplicar a X produtos"
- Após aplicar: limpar selecção, fechar dialog, toast sucesso

