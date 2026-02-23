

# Mobile Quick Product Creator (MQPC)

## Resumo

Wizard mobile-first de 3 passos para criar produtos na Loja Online em menos de 90 segundos, com upload de imagens, dados essenciais e melhoria opcional por IA.

## Arquitetura

A implementacao reutiliza ao maximo a infraestrutura existente:
- Hook `useCreateProduct` para criacao de produtos
- Bucket `product-images` do Supabase Storage (ja existe)
- Edge function `ai-product-assistant` (ja existe, modo "generate-description")
- Hook `useAdminStoreCategories` para dropdown de categorias
- Hook `useCRMAnalytics` / `safePush` para tracking de eventos

Nao serao criadas novas edge functions. A logica de criacao fica no frontend usando os hooks existentes, e a melhoria por IA usa o `ai-product-assistant` ja existente.

## Alteracoes

### 1. Nova pagina: `src/pages/MobileQuickProductCreate.tsx`

Pagina fullscreen mobile-first com wizard de 3 steps:
- Progress bar (Step 1/2/3) no topo
- Footer sticky com botao principal
- Navegacao entre steps com validacao

### 2. Componentes React (novos ficheiros)

**`src/components/mqpc/MQPCWizard.tsx`** - Componente principal do wizard com gestao de estado dos 3 steps

**`src/components/mqpc/MQPCStepImages.tsx`** - Step 1: Upload de imagens
- Upload ate 6 imagens via input file (aceita camera em mobile)
- Compressao client-side usando Canvas API (resize para max 1200px, qualidade 0.8)
- Preview em grid 3x2
- Remover imagem individual
- Reordenar com drag (ou botoes simples mover cima/baixo)
- Upload para bucket `product-images` com retry individual

**`src/components/mqpc/MQPCStepDetails.tsx`** - Step 2: Dados essenciais
- Nome (obrigatorio)
- Preco (obrigatorio, input numerico)
- Categoria (dropdown das `store_categories` existentes via `useAdminStoreCategories`)
- Toggle: Publicar ja (default: draft/rascunho)
- Slug auto-gerado a partir do nome

**`src/components/mqpc/MQPCStepExtras.tsx`** - Step 3: Opcional
- Botao "Melhorar com IA" que chama `ai-product-assistant` mode `generate-description` para gerar descricao curta, descricao longa, beneficios
- Seccao colapsavel avancada: SKU, stock quantity, stock status

### 3. Botao flutuante mobile: `src/components/mqpc/MQPCFloatingButton.tsx`

- Botao fixo no canto inferior direito, visivel apenas em mobile (`useIsMobile()`)
- Icone "+" com label "Produto"
- Renderizado dentro do `DashboardLayout` apenas nas paginas relevantes (store, products)
- Navega para `/mobile/products/quick-create`

### 4. Rota no `src/App.tsx`

Adicionar rota `/mobile/products/quick-create` apontando para `MobileQuickProductCreate`

### 5. Entry point na pagina de Produtos da Loja

Em `StoreProductsAdminPage.tsx`, adicionar botao "Criar Rapido" junto ao botao "Criar com IA" existente, que navega para a rota mobile.

### 6. Migracao DB (campos novos na tabela `products`)

Adicionar dois campos opcionais:
- `is_quick_created` boolean DEFAULT false
- `created_channel` text DEFAULT 'desktop' (valores: 'mobile_quick', 'desktop', 'api')

### 7. Analytics

Usar `safePush` do modulo de analytics existente para emitir os eventos:
- `mqpc_open`, `mqpc_image_upload_success`, `mqpc_created_draft`, `mqpc_created_active`, `mqpc_ai_improve_clicked`

## Fluxo do utilizador

```text
1. Utilizador clica no botao flutuante "+" ou em "Criar Rapido"
2. Step 1: Tira fotos ou seleciona imagens -> compressao automatica -> preview
3. Step 2: Preenche nome, preco, escolhe categoria, toggle publicar
4. Step 3: Opcionalmente clica "Melhorar com IA" para gerar descricoes
5. Clica "Criar Produto" -> produto criado via useCreateProduct
6. Redireccionado para lista de produtos com toast de sucesso
```

## Detalhes tecnicos

### Compressao de imagens (client-side)
```text
- Carregar imagem num Canvas
- Redimensionar para max 1200px (largura ou altura)
- Exportar como JPEG qualidade 0.8
- Resulta em ficheiros tipicamente < 200KB
```

### Upload resiliente
```text
- Upload individual por imagem para bucket "product-images"
- Path: products/{workspaceId}/{timestamp}-{index}.jpg
- Se falhar, mostrar botao retry na imagem especifica
- Nao bloquear o avancar para step 2 se pelo menos 1 imagem fez upload
```

### Integracao IA (Step 3)
```text
- Chama supabase.functions.invoke("ai-product-assistant", {
    body: { mode: "generate-description", productName, category }
  })
- Preenche campos de descricao curta, descricao longa, beneficios
- Nao bloqueia a UI - o utilizador pode criar sem esperar pela IA
```

### Seguranca
- Reutiliza `useCreateProduct` que ja inclui `workspace_id` e `created_by` automaticamente
- RLS existente nos `products` e `product-images` bucket ja protege por workspace
- Apenas utilizadores autenticados com workspace podem aceder a rota

## Ficheiros criados/modificados

| Ficheiro | Accao |
|---|---|
| `src/pages/MobileQuickProductCreate.tsx` | Novo |
| `src/components/mqpc/MQPCWizard.tsx` | Novo |
| `src/components/mqpc/MQPCStepImages.tsx` | Novo |
| `src/components/mqpc/MQPCStepDetails.tsx` | Novo |
| `src/components/mqpc/MQPCStepExtras.tsx` | Novo |
| `src/components/mqpc/MQPCFloatingButton.tsx` | Novo |
| `src/App.tsx` | Modificado (nova rota) |
| `src/pages/StoreProductsAdminPage.tsx` | Modificado (botao "Criar Rapido") |
| Migracao SQL | Novo (campos `is_quick_created`, `created_channel`) |

