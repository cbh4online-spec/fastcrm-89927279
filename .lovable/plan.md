
# Criar Notas de Encomenda Manuais (Rica e Dinamica)

## Contexto

Atualmente, as notas de encomenda so podem ser criadas por clientes B2B atraves do portal. Nao existe forma de um administrador criar uma nota de encomenda manualmente no backoffice. Esta funcionalidade e essencial para encomendas recebidas por telefone, email ou presencialmente.

## O que sera criado

Um formulario completo e dinamico de criacao de notas de encomenda manuais, acessivel a partir da pagina de Notas de Encomenda, com as seguintes capacidades:

### Funcionalidades principais

1. **Selecao de cliente** -- Pesquisa e selecao de clientes B2B existentes (client_users) com auto-preenchimento de morada de faturacao/envio
2. **Adicao dinamica de produtos** -- Pesquisa de produtos do catalogo com adicao em tempo real, com calculo automatico de IVA e totais
3. **Linhas manuais (produtos livres)** -- Possibilidade de adicionar linhas sem produto do catalogo (nome, preco e IVA manuais)
4. **Calculo automatico** -- Subtotal, IVA e total bruto calculados em tempo real a cada alteracao
5. **Edicao inline** -- Quantidade, preco unitario e taxa de IVA editaveis diretamente na tabela de itens
6. **Reordenacao** -- Drag-and-drop ou botoes para reordenar linhas
7. **Parcelas/Prestacoes** -- Opcao de solicitar pagamento em prestacoes
8. **Moradas** -- Campos de morada de faturacao e envio com copia rapida
9. **Notas** -- Notas do cliente e notas internas do admin
10. **Guardar como rascunho ou submeter** -- Duas acoes distintas

## Alteracoes tecnicas

### 1. Nova pagina: `src/pages/CreateOrderNotePage.tsx`

Pagina wrapper com DashboardLayout que renderiza o formulario de criacao.

### 2. Novo componente: `src/components/order-notes/CreateManualOrderNote.tsx`

Formulario principal multi-secao:

- **Secao Cliente**: Combobox de pesquisa nos `client_users` do workspace. Ao selecionar, preenche automaticamente moradas.
- **Secao Produtos**: Tabela dinamica com:
  - Botao "Adicionar Produto" que abre pesquisa no catalogo de `products`
  - Botao "Adicionar Linha Manual" para produto livre
  - Cada linha: imagem, nome, SKU, quantidade (editavel), preco unitario (editavel), taxa IVA (editavel, default 23%), total liquido, IVA, total bruto
  - Botao remover por linha
  - Resumo de totais em tempo real
- **Secao Moradas**: Formulario de morada de faturacao e envio (com botao "Copiar da faturacao")
- **Secao Prestacoes**: Toggle para ativar pedido de prestacoes + numero de prestacoes + notas
- **Secao Notas**: Notas do cliente + notas internas

### 3. Novo componente: `src/components/order-notes/ProductSearchDialog.tsx`

Dialog/Sheet para pesquisar e selecionar produtos do catalogo:
- Pesquisa por nome/SKU
- Mostra imagem, nome, SKU, preco base
- Selecao com quantidade inicial
- Ao selecionar, adiciona a linha ao formulario

### 4. Novo hook: `src/hooks/useCreateOrderNote.ts`

Mutation para criar a nota de encomenda:
- Gera numero de encomenda automatico (formato `NE-XXXXXXXX-XXXX`)
- Insere na tabela `order_notes` com status `draft` ou `submitted`
- Insere todos os items na tabela `order_note_items` com calculo de IVA
- Redireciona para o detalhe apos criacao

### 5. Atualizar rota em `src/App.tsx`

```
/dashboard/order-notes/create -> CreateOrderNotePage
```

### 6. Atualizar `src/pages/OrderNotesPage.tsx`

Adicionar botao "Nova Encomenda" no header que navega para `/dashboard/order-notes/create`.

### 7. Atualizar `src/components/order-notes/OrderNotesList.tsx`

Verificar que o estado `draft` aparece no filtro de estados (ja nao aparece atualmente).

## Fluxo do utilizador

```text
Pagina Notas de Encomenda
  |
  +-- Clica "Nova Encomenda"
  |
  +-- Formulario de Criacao
       |
       +-- 1. Seleciona cliente (pesquisa)
       +-- 2. Adiciona produtos (catalogo ou manual)
       +-- 3. Ajusta quantidades/precos/IVA
       +-- 4. Preenche moradas (auto-preenchidas)
       +-- 5. Opcao de prestacoes
       +-- 6. Adiciona notas
       +-- 7. "Guardar Rascunho" ou "Submeter"
       |
       +-- Redireciona para detalhe da encomenda
```

## Ficheiros a criar/editar

| Ficheiro | Acao |
|---|---|
| `src/pages/CreateOrderNotePage.tsx` | Criar |
| `src/components/order-notes/CreateManualOrderNote.tsx` | Criar |
| `src/components/order-notes/ProductSearchDialog.tsx` | Criar |
| `src/hooks/useCreateOrderNote.ts` | Criar |
| `src/pages/OrderNotesPage.tsx` | Editar (adicionar botao) |
| `src/components/order-notes/OrderNoteFilters.tsx` | Editar (adicionar estado draft) |
| `src/App.tsx` | Editar (adicionar rota) |

## Detalhes de implementacao

- O formulario usa estado local com `useState` para gerir as linhas de produto dinamicamente
- Cada linha calcula `line_total_net`, `vat_amount` e `line_total_gross` automaticamente
- Os totais globais sao recalculados com `useMemo` a cada alteracao
- A pesquisa de produtos usa a tabela `products` filtrada pelo workspace
- A pesquisa de clientes usa a tabela `client_users` filtrada pelo workspace
- Validacao com feedback visual: cliente obrigatorio, pelo menos 1 linha de produto
- O numero de encomenda e gerado automaticamente no servidor (timestamp + random)
