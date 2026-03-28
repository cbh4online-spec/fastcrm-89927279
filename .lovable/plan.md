

## Pesquisa de Produtos no Dialog de Adicionar Item

### O que muda

O campo "Nome" no `CreateRenewalItemDialog` passa de um simples `Input` de texto livre para um **campo com pesquisa inline de produtos**. O utilizador digita e vê sugestões do catálogo de produtos; ao selecionar, o nome e preço são preenchidos automaticamente. Continua a ser possível escrever um nome livre (para itens que não existem no catálogo).

### Como

**Ficheiro: `CreateRenewalItemDialog.tsx`**

1. Substituir o `Input` do nome por um **Combobox/Popover** com pesquisa:
   - Reutilizar a query de produtos já usada no `ProductSearchDialog` (busca por `name` e `sku` na tabela `products`)
   - Mostrar dropdown com resultados enquanto o utilizador digita (debounce 300ms)
   - Cada resultado mostra nome, SKU e preço
   - Ao selecionar um produto: preencher `name`, `unit_price` e guardar `product_id` no form
   - O utilizador pode ignorar as sugestões e escrever texto livre

2. Adicionar `product_id` opcional ao estado do form e ao payload enviado ao `createItem` (guardado no `meta_json` para rastreabilidade)

3. Visual: ícone de pesquisa no campo, lista dropdown com hover highlights, indicação de "nome livre" quando não seleciona produto

### Ficheiros alterados

| Ficheiro | Ação |
|---|---|
| `src/components/renewals/CreateRenewalItemDialog.tsx` | Substituir Input por combobox com pesquisa de produtos |

Sem alterações de base de dados.

