
# Checklist de QA Tecnico -- MQPC

Analise detalhada de cada ponto de QA, com o estado atual da implementacao, riscos identificados, e correcoes necessarias.

---

## 1. Idempotency: repetir submit 3x -- so 1 produto criado

**Estado: IMPLEMENTADO** -- com uma observacao importante.

O `MQPCWizard.tsx` gera uma `idempotencyKeyRef` unica por tentativa de criacao (linha 76-78). A Edge Function `product-quick-create` verifica a tabela `product_creation_idempotency` e retorna a resposta original se a chave ja existir (linhas 81-95).

**Teste recomendado:**

1. Preencher o wizard completo (imagens + dados + extras)
2. No passo 3, clicar "Criar Produto" rapidamente 3 vezes seguidas
3. Verificar na base de dados que apenas 1 produto foi criado
4. Verificar que o toast de sucesso aparece apenas 1 vez

**Risco identificado:** O botao "Criar Produto" so fica `disabled` quando `creating === true` (linha 230). Se o `setCreating(true)` nao executar antes do segundo clique (race condition muito improvavel no React, mas possivel em dispositivos lentos), podem ocorrer chamadas duplicadas. A idempotencia server-side protege contra isto, mas uma melhoria seria adicionar um `useRef` para bloquear chamadas concorrentes no client.

**Correcao sugerida (melhoria, nao bloqueante):**
- Adicionar um `submittingRef = useRef(false)` no `MQPCWizard` e verificar no inicio de `handleCreate` antes do `setCreating(true)`.

---

## 2. RLS: user de outro workspace tenta publicar -- FORBIDDEN

**Estado: IMPLEMENTADO** -- via logica na Edge Function (nao via RLS puro).

Todas as 3 Edge Functions (`product-quick-create`, `product-publish`, `product-ai-improve`) seguem o mesmo padrao:
1. Validam JWT
2. Verificam membership na tabela `workspace_members` filtrando por `workspace_id` + `user_id` + roles permitidos
3. Buscam o produto filtrando tambem por `workspace_id`

**Teste recomendado:**

1. Com User A (workspace X), criar um produto e anotar o `product_id`
2. Com User B (workspace Y), tentar chamar `product-publish` com esse `product_id` + `X-Workspace-Id` do workspace Y
3. Deve retornar 403 FORBIDDEN ("Product not found in this workspace")
4. Repetir com `product-ai-improve` -- mesmo resultado esperado

**Nota:** A protecao e feita a nivel da Edge Function com `adminClient` (service role key), nao com RLS do Supabase. Isto e seguro porque o filtro `workspace_id` e aplicado explicitamente em cada query. O `adminClient` bypassa RLS, mas a logica de filtro e equivalente.

---

## 3. Uploads: falhar 1 imagem -- retry individual funciona

**Estado: IMPLEMENTADO**

O `MQPCStepImages.tsx` tem:
- Upload sequencial por imagem (linhas 190-201) -- se uma falha, as restantes continuam
- Funcao `retryUpload` (linhas 216-241) que solicita novo presigned URL e tenta novamente apenas para a imagem com erro
- UI com botao "Retry" visivel quando `img.error === true` (linhas 261-267)

**Teste recomendado:**

1. Adicionar 3 imagens
2. Desligar a rede durante o upload da 2a imagem (ou simular com DevTools > Network > Offline)
3. Verificar que a 2a imagem mostra o overlay vermelho com botao "Retry"
4. Reativar a rede e clicar "Retry"
5. Verificar que a imagem sobe com sucesso e o overlay desaparece

**Risco identificado:** Se o presigned URL expirar (600 segundos = 10 min), o retry vai falhar novamente. A funcao `retryUpload` solicita um NOVO presigned URL, portanto este cenario esta coberto.

---

## 4. Mobile: teclado numerico no preco, botoes sticky nao tapam inputs

**Estado: PARCIALMENTE IMPLEMENTADO**

**Teclado numerico:**
- Campo de preco: `inputMode="decimal"` (linha 75 de `MQPCStepDetails.tsx`) -- abre teclado numerico com ponto decimal em iOS/Android
- Campo de stock: `inputMode="numeric"` (linha 134 de `MQPCStepExtras.tsx`) -- abre teclado numerico sem decimal

**Botoes sticky:**
- Header: `sticky top-0 z-10` (linha 180 de `MQPCWizard.tsx`)
- Footer: `sticky bottom-0` com `safe-area-pb` (linha 221 de `MQPCWizard.tsx`)
- Content: `flex-1 overflow-auto px-4 py-6` (linha 207)

**Teste recomendado:**

1. Abrir no dispositivo movel real (ou Chrome DevTools com device mode)
2. No passo 2 (Dados), tocar no campo "Preco" -- verificar que aparece teclado numerico
3. Fazer scroll ate ao ultimo campo -- verificar que o footer "Seguinte" nao tapa o input activo
4. Em iOS Safari, verificar que a classe `safe-area-pb` funciona (padding para a home bar)
5. Com teclado aberto, verificar que o conteudo faz scroll e o input fica visivel

**Risco identificado:** A classe `safe-area-pb` nao esta definida por defeito no Tailwind. Precisa ser verificada no `tailwind.config` ou como utility customizada. Se nao existir, em iPhones com notch/dynamic island o footer pode ficar parcialmente tapado.

**Correcao sugerida:**
- Verificar se `safe-area-pb` esta configurada no Tailwind. Se nao estiver, adicionar:
  ```css
  .safe-area-pb { padding-bottom: env(safe-area-inset-bottom, 0px); }
  ```
- Alternativamente, usar `pb-[env(safe-area-inset-bottom)]` diretamente.

---

## 5. IA: product-ai-improve atualiza so campos previstos

**Estado: IMPLEMENTADO**

A Edge Function `product-ai-improve` (linhas 208-243) so faz write-back dos campos mapeados:
- `generated.short_description` -> `products.short_description`
- `generated.long_description` -> `products.commercial_description`
- `generated.tags` -> `products.search_keywords` (join com ", ")
- `generated.seo_snippet` -> `products.specifications.seo_snippet` (jsonb)

O mapeamento e explicito -- nao ha spread de todo o objecto `generated` no update.

**Teste recomendado:**

1. Criar um produto com dados completos (nome, preco, SKU, descricao manual)
2. Chamar `product-ai-improve` com `generate: { short_description: true, tags: true }` e `options: { write_back: true }`
3. Verificar na DB que APENAS `short_description` e `search_keywords` foram alterados
4. Confirmar que `commercial_description`, `sku`, `base_price`, `name` ficaram inalterados

**Nota extra:** A funcao de IA usa tool calling com `additionalProperties: false` (linha 169), o que impede o modelo de retornar campos nao solicitados.

---

## 6. Performance: 6 imagens comprimidas -- upload aceitavel em 4G

**Estado: IMPLEMENTADO** -- com mecanismos de otimizacao.

Mecanismos implementados:
- **Compressao client-side:** Canvas API, max 1200px, JPEG quality 0.8 (linhas 38-70 de `MQPCStepImages`)
- **Presigned URLs em batch:** Um unico request para obter URLs de todas as imagens (linhas 72-91)
- **Upload sequencial** (nao paralelo): cada imagem e uploaded uma de cada vez (linhas 190-201)

**Teste recomendado:**

1. No Chrome DevTools, configurar Network throttling para "Regular 4G" (4 Mbps download, 3 Mbps upload)
2. Selecionar 6 fotos de alta resolucao (4+ MP)
3. Medir tempo total desde a selecao ate todos os uploads completos
4. Alvo: menos de 30 segundos para 6 imagens comprimidas (~200-400KB cada)

**Risco identificado:** O upload sequencial e mais lento que paralelo, mas mais seguro em redes moveis (evita sobrecarga). Uma imagem de 400KB a 3 Mbps demora ~1 segundo, portanto 6 imagens = ~6-10 segundos mais o tempo de compressao.

**Possivel melhoria futura (nao bloqueante):**
- Upload paralelo com concorrencia limitada (max 2-3 simultaneos) para melhorar a performance sem sobrecarregar a rede movel.

---

## Resumo de accoes

| Item | Estado | Accao necessaria |
|---|---|---|
| 1. Idempotency | OK | Melhoria opcional: guard ref no client |
| 2. RLS/Workspace isolation | OK | Nenhuma |
| 3. Upload retry individual | OK | Nenhuma |
| 4. Mobile UX (teclado/sticky) | Parcial | Verificar/adicionar `safe-area-pb` CSS |
| 5. IA write-back controlado | OK | Nenhuma |
| 6. Performance 6 imagens 4G | OK | Melhoria futura: upload paralelo limitado |

### Correcoes a implementar

**Prioridade 1 (recomendado):**
- Verificar se a classe CSS `safe-area-pb` existe no projeto. Se nao, adiciona-la no `index.css` ou como utility Tailwind.

**Prioridade 2 (melhoria de robustez):**
- Adicionar `submittingRef` guard no `MQPCWizard.handleCreate` para prevencao client-side de double-submit.

### Ficheiros a modificar

| Ficheiro | Alteracao |
|---|---|
| `src/index.css` (ou equivalente) | Adicionar `.safe-area-pb` se nao existir |
| `src/components/mqpc/MQPCWizard.tsx` | Guard ref opcional no `handleCreate` |
