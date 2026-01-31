
# Fase 5: Experiência do Cliente (Portal B2B)

## Objectivo
Aumentar velocidade, criar hábito de compra e fidelizar clientes através de funcionalidades que reduzem fricção no processo de encomenda.

---

## 5.1 Repetir Encomenda (1-Click Reorder)

**Funcionalidade**: Permitir ao cliente duplicar uma encomenda anterior com um clique.

**Implementação**:

1. **Componente `RepeatOrderButton.tsx`**
   - Botão "Repetir Encomenda" exibido no `OrderCard` e página de detalhe
   - Ao clicar:
     - Valida disponibilidade actual de cada produto
     - Aplica preços actualizados (respeitando escalões do cliente)
     - Adiciona todos os itens ao carrinho
     - Redireciona para `/client/cart`
   - Mostra alerta se algum produto estiver indisponível ou com preço diferente

2. **Lógica de validação**:
   - Verifica `stock_status` de cada produto
   - Recalcula preços com base no `price_tier` actual do cliente
   - Alerta visual para produtos alterados ou removidos

3. **Integração no `OrderCard`**:
   - Adicionar botão ao lado de "Ver detalhes"
   - Exibir apenas para encomendas com status `approved`, `in_preparation`, ou `invoiced`

---

## 5.2 Lista de Favoritos

**Funcionalidade**: Clientes podem marcar produtos como favoritos para acesso rápido.

**Base de dados**:

```text
Tabela: client_favorites
- id: uuid (PK)
- client_user_id: uuid (FK -> client_users)
- product_id: uuid (FK -> products)
- created_at: timestamp
- Índice único: (client_user_id, product_id)
```

**Implementação**:

1. **Hook `useClientFavorites.ts`**
   - `favorites`: lista de produtos favoritos
   - `isFavorite(productId)`: verificar se produto está nos favoritos
   - `toggleFavorite(productId)`: adicionar/remover favorito
   - Optimistic updates para resposta imediata

2. **Componente `FavoriteButton.tsx`**
   - Botão coração que alterna estado
   - Animação ao favoritar
   - Exibido no catálogo e modal de produto

3. **Página `ClientFavoritesPage.tsx`**
   - Nova rota: `/client/favorites`
   - Grid de produtos favoritos com quick-add ao carrinho
   - Link no menu de navegação

4. **Actualização da navegação**:
   - Adicionar item "Favoritos" ao `ClientLayout.tsx`
   - Badge com contador de favoritos

---

## 5.3 Perfis de Compra por Tipo de Cliente

**Funcionalidade**: Catálogo filtrado automaticamente baseado no tipo de negócio do cliente.

**Base de dados**:
- Campo `business_type` já adicionado à tabela `client_users` na Fase 1
- Tipos disponíveis: `hairdresser`, `clinic`, `therapist`, `aesthetics`, `pharmacy`, `other`

**Implementação**:

1. **Componente `BusinessTypeFilter.tsx`**
   - Selector de perfil no topo do catálogo
   - Opção "Ver todos" para catálogo completo
   - Persiste preferência no localStorage

2. **Extensão da tabela `products`**:
   - Novo campo `business_types` (array de strings)
   - Produtos podem ser marcados para múltiplos tipos de negócio

3. **Hook `useClientProducts` actualizado**:
   - Filtro automático por `business_type` do cliente
   - Toggle para ver catálogo completo
   - Ordenação de produtos relevantes primeiro

4. **Sugestões personalizadas**:
   - Secção "Recomendados para si" no dashboard
   - Baseado em `business_type` e histórico de compras

---

## Estrutura de Ficheiros

```text
src/
├── components/
│   └── client-portal/
│       ├── RepeatOrderButton.tsx (novo)
│       ├── FavoriteButton.tsx (novo)
│       ├── FavoritesList.tsx (novo)
│       └── BusinessTypeFilter.tsx (novo)
├── hooks/
│   └── client-portal/
│       └── useClientFavorites.ts (novo)
├── pages/
│   └── client/
│       └── ClientFavoritesPage.tsx (novo)
```

**Ficheiros a modificar**:
- `src/components/client-portal/orders/OrderCard.tsx` - adicionar botão repetir
- `src/components/client-portal/ClientLayout.tsx` - adicionar link favoritos
- `src/pages/client/ClientCatalogPage.tsx` - adicionar botão favoritos e filtro perfil
- `src/App.tsx` - adicionar rota favoritos

---

## Migração de Base de Dados

```text
1. Criar tabela client_favorites:
   - id, client_user_id, product_id, created_at
   - Constraint única (client_user_id, product_id)
   - RLS policies para clientes acederem apenas aos seus favoritos

2. Adicionar campo business_types à tabela products:
   - Array de strings para tipos de negócio
   - Default: array vazio (visível para todos)
```

---

## Fluxo de Utilizador

### Repetir Encomenda
```text
1. Cliente abre histórico de encomendas
2. Clica em "Repetir" numa encomenda anterior
3. Sistema valida disponibilidade e preços
4. Mostra resumo de alterações (se houver)
5. Adiciona itens ao carrinho
6. Redireciona para checkout
```

### Favoritos
```text
1. Cliente navega no catálogo
2. Clica no coração de um produto
3. Produto aparece na página "Favoritos"
4. Quick-add ao carrinho a partir dos favoritos
```

### Perfil de Compra
```text
1. Cliente (tipo "Clínica") abre catálogo
2. Vê automaticamente produtos relevantes para clínicas
3. Pode alternar para "Ver todos"
4. Dashboard mostra recomendações personalizadas
```

---

## Detalhes Técnicos

### Hook useClientFavorites

```text
- Query: GET favoritos do cliente autenticado
- Mutations: INSERT/DELETE com optimistic updates
- Cache: Invalidação selectiva para performance
```

### RepeatOrderButton Logic

```text
1. Fetch produtos actuais pelos IDs da encomenda
2. Comparar preços e disponibilidade
3. Gerar relatório de diferenças
4. Se tudo OK: addItem() para cada produto
5. Se há problemas: mostrar modal de confirmação
```

### RLS Policies

```text
- client_favorites: SELECT/INSERT/DELETE onde client_user_id = auth.uid()
- Acesso restrito ao próprio cliente
```

---

## Estimativa de Esforço

| Componente | Tempo Estimado |
|------------|----------------|
| Migração BD (favoritos + business_types) | 30 min |
| useClientFavorites hook | 45 min |
| FavoriteButton + FavoritesList | 45 min |
| ClientFavoritesPage | 30 min |
| RepeatOrderButton | 1 hora |
| BusinessTypeFilter | 45 min |
| Actualizações catálogo/layout | 30 min |
| Testes e ajustes | 30 min |

**Total**: ~5-6 horas
