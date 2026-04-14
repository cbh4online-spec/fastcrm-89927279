

## Diagnóstico

Atualmente, a funcionalidade de lives está **completamente isolada no backoffice** (`/dashboard/marketplace/lives`). Um vendedor precisa de navegar pelo dashboard para criar e iniciar uma live. A página pública (`/marketplace/:slug/lives`) é read-only — mostra lives existentes mas não permite ao vendedor autenticado iniciar uma live a partir daí.

O pedido é claro: tornar a experiência de live streaming **tão simples como no Facebook** — o vendedor deve poder iniciar uma live directamente a partir do marketplace público, sem precisar de entrar no backoffice.

## Plano de implementação

### 1. Botão "Ir ao Vivo" na galeria pública de lives
**Ficheiro:** `src/pages/c2c/C2CPublicLivesGallery.tsx`
- Detectar se o utilizador autenticado é um vendedor aprovado naquele workspace (query a `c2c_sellers` com `user_id` e `status = 'approved'`)
- Se sim, mostrar botão flutuante **"🔴 Ir ao Vivo"** no hero da página (estilo Facebook)
- Ao clicar, abrir o modal `GoLiveModal` adaptado (ou redirecionar para uma versão pública do setup)

### 2. Botão "Ir ao Vivo" no perfil público do vendedor
**Ficheiro:** `src/pages/c2c/C2CPublicSellerProfile.tsx`
- Se o utilizador autenticado é o dono daquele perfil de vendedor, mostrar botão "Ir ao Vivo" no cabeçalho do perfil
- Mesma lógica: abrir modal simplificado de criação de live

### 3. Criar hook `useIsApprovedSeller`
**Ficheiro novo:** `src/hooks/c2c/useIsApprovedSeller.ts`
- Recebe `workspaceId`
- Verifica se o user autenticado tem registo em `c2c_sellers` com `status = 'approved'` naquele workspace
- Retorna `{ isSeller, sellerId, isLoading }`

### 4. Adaptar o `GoLiveModal` para contexto público
**Ficheiro:** `src/components/c2c/livestream/GoLiveModal.tsx`
- Actualmente depende de `useWorkspace()` (contexto do dashboard) — precisa de aceitar `workspaceId` como prop alternativa
- Após criar a live com sucesso no modo "agora", redirecionar para a rota pública `/marketplace/:slug/live/:id` em vez da rota do dashboard
- Receber `workspaceSlug` como prop para construir o URL correcto

### 5. Simplificar o fluxo (estilo Facebook)
- No modal público, manter apenas: **título**, **categoria** (opcional), e botão **"Ir ao Vivo"**
- Remover a opção de "agendar" na versão pública (manter apenas no backoffice)
- Após clicar "Ir ao Vivo", redirecionar para uma página de setup simplificada que também vive no contexto público

### 6. Criar rota pública de setup de live
**Ficheiro novo:** `src/pages/c2c/C2CPublicGoLiveSetup.tsx`
- Versão simplificada do `C2CGoLiveSetup.tsx` que funciona fora do dashboard
- Usa o `workspaceSlug` do URL para resolver o workspace
- Requer autenticação (redirect para login se não autenticado)
- Após ir ao vivo, navega para `/marketplace/:slug/live/:id`

**Rota em App.tsx:** `/marketplace/:workspaceSlug/go-live`

### 7. Link de partilha da live
- O botão de partilha gera sempre o URL público `/marketplace/:slug/live/:id`
- Na galeria pública, cada card de live já navega correctamente para o viewer público

### Ficheiros impactados
- **Novo:** `src/hooks/c2c/useIsApprovedSeller.ts`
- **Novo:** `src/pages/c2c/C2CPublicGoLiveSetup.tsx`
- **Editar:** `src/pages/c2c/C2CPublicLivesGallery.tsx` — adicionar botão "Ir ao Vivo" para vendedores
- **Editar:** `src/pages/c2c/C2CPublicSellerProfile.tsx` — botão "Ir ao Vivo" no perfil
- **Editar:** `src/components/c2c/livestream/GoLiveModal.tsx` — aceitar `workspaceId`/`workspaceSlug` como props
- **Editar:** `src/App.tsx` — nova rota `/marketplace/:workspaceSlug/go-live`

### Segurança
- Apenas vendedores aprovados (`c2c_sellers.status = 'approved'`) veem o botão
- A criação da live continua protegida por RLS (requer `auth.uid()` = `seller_id`)
- Visitantes não autenticados veem apenas a galeria read-only

### Critérios de aceitação
- Vendedor autenticado vê botão "Ir ao Vivo" na galeria pública e no seu perfil
- Visitante não autenticado NÃO vê o botão
- Fluxo completo: clicar → preencher título → setup câmara → ir ao vivo → viewer público
- Link de partilha funciona para qualquer pessoa (sem auth)
- Não é necessário aceder ao backoffice para fazer uma live

