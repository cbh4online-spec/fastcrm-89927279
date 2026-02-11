

# Rastreamento de Carrinhos em Tempo Real e Painel de Carrinhos Abandonados

## Problema Atual

O carrinho de compras vive exclusivamente no `localStorage` do browser do visitante. O registo na base de dados (`store_abandoned_carts`) so e criado quando o cliente chega ao checkout e fornece dados de contacto. Isto significa que um visitante com 2 artigos no carrinho que nunca chega ao checkout e **completamente invisivel** para o administrador.

## O Que Muda

### 1. Sincronizar o carrinho com a base de dados em tempo real

Sempre que um visitante adiciona ou remove itens do carrinho, o `StoreCartContext` sincroniza automaticamente com a tabela `store_visitor_sessions`, adicionando os dados do carrinho (itens, subtotal) a sessao ja existente.

Novos campos na tabela `store_visitor_sessions`:

| Coluna | Tipo | Descricao |
|---|---|---|
| `cart_items` | jsonb | Array com os itens no carrinho (id, nome, preco, quantidade) |
| `cart_subtotal` | numeric | Valor total do carrinho |
| `cart_updated_at` | timestamptz | Ultima alteracao ao carrinho |

Isto reutiliza a sessao de visitante que ja existe (via `useStoreVisitorTracking`), sem criar registos novos.

### 2. Detecao automatica de abandono

Adicionar um job `pg_cron` (a cada 15 minutos) que:
- Procura sessoes com `cart_items IS NOT NULL` e `last_activity_at < NOW() - INTERVAL '30 minutes'` e `converted = false`
- Cria automaticamente registos em `store_abandoned_carts` para essas sessoes
- Marca a sessao como processada para nao duplicar

Isto garante que mesmo visitantes anonimos (sem dados de contacto) ficam registados como carrinhos abandonados.

### 3. Painel de Carrinhos Ativos e Abandonados

Novo separador "Carrinhos" no `StoreAnalyticsPage` com dois blocos:

**Carrinhos Ativos (Agora):**
- Lista de visitantes com carrinho ativo (ultimos 30 min de atividade)
- Mostra: dispositivo, produtos no carrinho, valor, tempo na loja
- Badge de "ao vivo" com indicador visual

**Carrinhos Abandonados:**
- Lista da tabela `store_abandoned_carts`
- Estado (abandonado/contactado/recuperado/expirado)
- KPIs: total de carrinhos abandonados, valor perdido, taxa de recuperacao
- Botao para iniciar tentativa de recuperacao

## Seccao Tecnica

### Migracao SQL

```text
ALTER TABLE store_visitor_sessions 
  ADD COLUMN cart_items jsonb,
  ADD COLUMN cart_subtotal numeric DEFAULT 0,
  ADD COLUMN cart_updated_at timestamptz;
```

### Ficheiro: `src/contexts/StoreCartContext.tsx`

Adicionar sincronizacao com a base de dados:
- Importar `supabase` e ler o `session_id` do `localStorage` (mesma chave usada pelo `useStoreVisitorTracking`)
- No `useEffect` que ja observa mudancas em `items`, adicionar um debounce (2 segundos) que faz upsert dos dados do carrinho em `store_visitor_sessions`
- Incluir `workspace_id` como prop do `StoreCartProvider` (passado via route context)

### Ficheiro: `supabase/functions/detect-abandoned-carts/index.ts` (novo)

Edge function invocada por cron que:
1. Busca sessoes com carrinho ativo e sem atividade ha mais de 30 min
2. Cria registos em `store_abandoned_carts` com os dados do carrinho
3. Limpa o campo `cart_items` da sessao processada

### Ficheiro: `src/pages/StoreAnalyticsPage.tsx`

Novo separador "Carrinhos" com:
- Query a `store_visitor_sessions` onde `cart_items IS NOT NULL` e `last_activity_at > NOW() - 30min` (carrinhos ativos)
- Query a `store_abandoned_carts` com estatisticas e listagem
- Botao de recuperacao usando o hook `useSendCartRecovery` ja existente

### Ficheiro: `src/hooks/useStoreVisitorTracking.ts`

Nenhuma alteracao necessaria -- a sincronizacao sera feita pelo `StoreCartContext` diretamente para nao duplicar logica.

### Agendamento Cron

Configurar `pg_cron` para invocar `detect-abandoned-carts` a cada 15 minutos.

### Resumo de ficheiros

| Ficheiro | Alteracao |
|---|---|
| Nova migracao SQL | Adicionar `cart_items`, `cart_subtotal`, `cart_updated_at` a `store_visitor_sessions` |
| `src/contexts/StoreCartContext.tsx` | Sincronizar carrinho com DB via debounce |
| `supabase/functions/detect-abandoned-carts/index.ts` | Nova funcao para detetar carrinhos abandonados automaticamente |
| `src/pages/StoreAnalyticsPage.tsx` | Novo separador "Carrinhos" com vista ao vivo e abandonados |
| Nova migracao SQL (cron) | Agendar detetor de abandono a cada 15 min |
