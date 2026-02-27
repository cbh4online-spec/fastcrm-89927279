

# Restaurar Portal B2B Completo na Navegacao

## Problema

O Portal B2B era um modulo completo com:
- Notas de Encomenda (listagem, criacao, detalhe)
- Aprovacoes de encomendas
- Gestao de utilizadores cliente (Client Users)
- Configuracoes do Portal B2B
- Catalogo de produtos
- Stock B2B
- Portal do cliente (rotas /client/*)

Todos estes componentes e rotas **existem** no codigo e funcionam. O problema e que so aparecem na sidebar quando o modulo `b2b-portal` esta instalado via Marketplace (`workspace_modules` + `marketplace_modules`). Se o modulo nao estiver activo na base de dados, os links desaparecem da sidebar.

## Solucao

Adicionar todos os sub-itens do Portal B2B como itens fixos na navegacao `nav.v1.ts`, agrupados sob um novo grupo "Portal B2B", para que aparecam sempre — independentemente do estado da extensao no Marketplace.

Tambem expandir o registo no `extensionRegistry.ts` para incluir todos os tabs relevantes (nao apenas "Notas Encomenda").

## Alteracoes

### 1. Expandir grupo "Vendas" em `nav.v1.ts` para "Portal B2B"

Substituir o item unico "Notas Encomenda" no grupo "Vendas" por um grupo completo "Portal B2B" com todos os sub-modulos:

| Item | Rota | Icone |
|---|---|---|
| Notas Encomenda | /dashboard/order-notes | FileText |
| Aprovacoes | /dashboard/order-approvals | CheckSquare |
| Clientes B2B | /dashboard/client-users | Users |
| Produtos | /dashboard/products | ShoppingBag |
| Stock B2B | /dashboard/b2b-stock | Package |
| Config. Portal | /dashboard/b2b-portal | Settings |

### 2. Adicionar items equivalentes em `nav.v2.ts`

Adicionar pelo menos "Notas Encomenda" e "Aprovacoes" como items directos (o V2 e mais compacto).

### 3. Expandir `extensionRegistry.ts`

Adicionar mais `objectTabs` ao modulo `b2b-portal` para que, quando instalado via Marketplace, tambem mostre Aprovacoes, Clientes B2B, Produtos e Config. Portal.

### 4. Remover duplicacao

O item "Notas Encomenda" que foi adicionado isoladamente no grupo "Vendas" sera substituido pelo grupo "Portal B2B" completo, evitando duplicacao.

## Ficheiros a alterar

| Ficheiro | Accao |
|---|---|
| `src/config/nav.v1.ts` | Substituir grupo "Vendas" por "Portal B2B" com 6 itens |
| `src/config/nav.v2.ts` | Manter/ajustar item "Notas Encomenda", adicionar "Aprovacoes" |
| `src/config/extensionRegistry.ts` | Expandir objectTabs do modulo b2b-portal |

