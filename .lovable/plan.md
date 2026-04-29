## Diagnóstico

Hoje há **4 canais de publicação distintos** para um produto, mas estão dispersos pela UI e dois deles não são óbvios:

| Canal | Coluna/tabela | Como se ativa hoje | Estado |
|---|---|---|---|
| Portal B2B | `products.b2b_published` | Toggle existe no `CreateProductDialog` (linha 521) | OK |
| Loja online | `products.store_published` | Toggle disperso, há mutação em `useProductsListState` | OK |
| Ficha pública | `products.sheet_published` | Aba "Ficha" do `ProductDetailDialog` (`ProductSheetSettings`) | OK |
| Catálogos digitais (folheáveis) | `product_catalog_items` (manual) | **Só via "Adicionar produtos" no editor de cada catálogo** | **Origem da confusão** |

O utilizador esperava que ao publicar um produto, ele aparecesse automaticamente no menu **Catálogos**. Mas esses catálogos são curados manualmente — só aparecem produtos que tenham sido adicionados explicitamente. **Não há ponto único onde o utilizador veja "onde é que este produto está publicado" e possa decidir tudo a partir do produto.**

## Decisões de produto e UX

1. Criar um único componente reutilizável **`ProductPublishingPanel`** que mostra:
   - 3 toggles (Portal B2B, Loja online, Ficha pública) com descrição clara e badge de canais ativos.
   - Lista pesquisável dos catálogos digitais do workspace, com checkbox para adicionar/remover este produto.
   - Atalho "Gerir catálogos" para a página de gestão.
   - Link directo para a ficha pública quando publicada.
2. Integrar o painel em **dois locais**:
   - **`ProductDetailDialog`** — nova aba "Publicação" (entre "Ficha" e "Relações") com gravação imediata por toggle.
   - **`CreateProductDialog`** — secção "Onde publicar" no fim do formulário (modo "local"); ao gravar o produto, aplicam-se os toggles e adiciona-se aos catálogos selecionados.
3. **Indicador na lista** de produtos: melhorar a coluna "Loja Online" / "Portal B2B" existente para mostrar também "Ficha" e nº de catálogos digitais (badge clicável que abre directamente a aba Publicação).
4. **Sincronia bidirecional**: se um produto for adicionado/removido no editor de um catálogo, o painel reflecte isso na próxima abertura (já garantido pela query `product-catalog-membership`).

## Estrutura técnica

Sem alterações de DB — toda a infra existe (`product_catalogs`, `product_catalog_items` com unique `(catalog_id, product_id)`). Componentes:

- **`src/components/products/ProductPublishingPanel.tsx`** (novo)
  - Props: `productId | null`, `initial`, `onLocalChange`, `compact`.
  - Modo edit: persiste cada toggle directamente em `products` e `product_catalog_items` com optimistic updates.
  - Modo create: mantém estado local e expõe-no via `onLocalChange` para o `CreateProductDialog` aplicar no submit.
  - Reutiliza `useWorkspace`, `supabase` client, queries com TanStack Query.

- **`src/components/products/ProductDetailDialog.tsx`** (edit)
  - Acrescentar `<TabsTrigger value="publishing">Publicação</TabsTrigger>` (linha ~340) com ícone `Send`/`Globe`.
  - Adicionar `<TabsContent value="publishing">` que renderiza `<ProductPublishingPanel productId={productId} />`.

- **`src/components/products/CreateProductDialog.tsx`** (edit)
  - Importar `ProductPublishingPanel`.
  - Adicionar estado `selectedCatalogIds` e usar `onLocalChange` para receber as decisões.
  - Render do painel numa secção `Collapsible` "Onde publicar" antes dos botões de ação.
  - No `handleSubmit`, depois do `useCreateProduct.mutateAsync`, fazer batch `insert` em `product_catalog_items` para os IDs selecionados (opcional — já temos `b2bPublished` no payload).

- **`src/components/products/table/ProductsDataTable.tsx`** (pequeno ajuste)
  - Coluna existente `b2b_published`/`store_published` continua. Adicionar coluna opcional `publishing_channels` que mostra ícones com tooltip resumindo os 4 canais.

## Plano de implementação

1. Criar `ProductPublishingPanel.tsx` com toggles + lista de catálogos + mutações.
2. Integrar nova aba "Publicação" em `ProductDetailDialog`.
3. Integrar secção "Onde publicar" em `CreateProductDialog` + lógica de aplicar catálogos no submit.
4. Acrescentar coluna unificada de canais em `ProductsDataTable` (não-default; opt-in via preset).
5. QA: criar produto novo com 2 catálogos selecionados, abrir "Catálogos" → confirmar inclusão; alterar toggles a partir do detalhe e confirmar que `usePartnerCatalog` / `useStoreProducts` reflectem; remover do catálogo via editor antigo e confirmar que o painel actualiza.

## Critérios de aceitação

- Editar um produto abre uma aba "Publicação" que lista os 4 canais e o estado de inclusão em catálogos digitais.
- Marcar um catálogo no painel adiciona o produto ao catálogo (e vice-versa) sem precisar de abrir o editor.
- Criar um produto novo permite escolher canais e catálogos no mesmo formulário; tudo é persistido no submit.
- O painel mostra um link directo para a ficha pública quando esta existe.
- A lista de produtos pode mostrar uma coluna "Canais" com os 4 indicadores.

## Riscos e pontos por validar

- **Permissões**: respeitar o sistema de permissões de campo (`store_published`, `b2b_published`, `sheet_published` já estão no catálogo) — se o user tiver `view`, o toggle aparece desativado.
- **Conflito com `ProductSheetSettings`**: a aba "Ficha" continua a existir para configuração avançada (slug, watermark, etc.); a nova aba só faz o toggle on/off. Sem duplicação funcional, apenas atalho.
- Confirmar que a unique constraint `(catalog_id, product_id)` é tratada graciosamente (já está no código com `if (!error.message.includes("duplicate"))`).
- Não alterar comportamento dos catálogos existentes — a inclusão manual via editor continua a funcionar exactamente como hoje.
