

# Corrigir Importação: Atualizar Produtos com SKU Duplicado

## Diagnóstico

O importador de produtos (`useProducts.ts`, função `bulkImportProducts`) verifica SKUs existentes na base de dados **antes** da inserção e salta todos os que já existem, marcando-os como "SKU duplicado na base de dados". Isto causou 1558 produtos rejeitados.

O utilizador pretende que, quando um SKU já existe, os dados sejam **atualizados** em vez de ignorados.

## Solução

Modificar a lógica de importação para fazer **upsert** dos produtos com SKU duplicado: atualizar campos existentes (nome, categoria, preço, descrição, etc.) mantendo o `id` original.

## Alterações

| Ficheiro | Acção |
|---|---|
| `src/hooks/useProducts.ts` | Alterar `bulkImportProducts` para fazer upsert dos SKUs existentes em vez de os saltar |

### Detalhe técnico

Na função `bulkImportProducts`:

1. **Remover o skip de duplicados** — em vez de adicionar ao array `skipped`, mover esses itens para um array `toUpdate`
2. **Buscar IDs dos produtos existentes** — query por SKU para obter os `id` correspondentes
3. **Atualizar em batch** — para cada produto existente, fazer `update` com os novos dados (nome, categoria, preço de venda, preço de custo, descrição, barcode, etc.)
4. **Manter contadores separados** — reportar ao utilizador quantos foram criados vs. atualizados
5. **Imagens** — se o ficheiro trouxer novas URLs de imagem, adicionar às `product_images` existentes (sem duplicar)

O fluxo passa a ser:
- SKU existe na DB → atualizar campos com dados do ficheiro
- SKU duplicado no lote → saltar (manter comportamento actual)
- SKU novo → inserir (manter comportamento actual)

A mensagem de sucesso passará a mostrar: "X criados, Y atualizados, Z ignorados".

