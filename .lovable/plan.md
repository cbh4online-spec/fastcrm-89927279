

# Fluxo de Upload via Presigned URLs para MQPC

## Problema

Atualmente, o `MQPCStepImages` faz upload direto para o Storage usando o Supabase client SDK (`supabase.storage.from("product-images").upload(...)`). Isto funciona, mas em redes moveis instáveis pode haver falhas silenciosas e nao há controlo server-side sobre os paths ou validação dos ficheiros.

O fluxo recomendado separa a responsabilidade:
1. Edge Function gera URLs assinadas (presigned)
2. App faz upload direto para Storage via HTTP PUT
3. App passa os `storage_paths` ao `product-quick-create`

## Alteracoes

### 1. Nova Edge Function: `product-images-presign/index.ts`

Recebe um pedido com o numero de imagens a fazer upload e retorna URLs assinadas para cada uma.

```text
POST /product-images-presign

Headers:
  Authorization: Bearer <jwt>
  X-Workspace-Id: <uuid>

Body:
  { count: number }  (1 a 6)

Fluxo:
  1. Validar JWT
  2. Validar workspace membership
  3. Gerar paths únicos: products/{workspaceId}/{timestamp}-{0..n}.jpg
  4. Chamar supabase.storage.from("product-images").createSignedUploadUrl(path) para cada
  5. Retornar array de { path, signedUrl, token }

Response 200:
  { uploads: [{ path, signedUrl, token }, ...] }
```

### 2. Atualizar `MQPCStepImages.tsx`

Substituir o fluxo de upload atual (SDK direto) por:

```text
Fluxo anterior:
  compressImage() -> supabase.storage.upload(path, blob) -> getPublicUrl()

Fluxo novo:
  1. compressImage() (igual)
  2. supabase.functions.invoke("product-images-presign", { body: { count }, headers: { "X-Workspace-Id": ... } })
  3. Para cada imagem: fetch(signedUrl, { method: "PUT", body: blob, headers: { "Content-Type": "image/jpeg" } })
  4. Guardar o storage_path (nao a URL publica) no estado do ImageItem
  5. Gerar URL publica localmente: ${SUPABASE_URL}/storage/v1/object/public/product-images/${path}
```

O retry individual continua a funcionar - basta repetir o PUT para o mesmo signedUrl (válido por ~60 minutos).

Adicionar novo campo ao `ImageItem`:
- `storagePath: string | null` - o path no bucket, usado pelo `product-quick-create`

### 3. Atualizar `MQPCWizard.tsx`

Na chamada final de criação, passar `storage_paths` em vez de `image_urls`:

```text
De: images: imageUrls (URLs públicas)
Para: storage_paths: images.filter(i => i.storagePath).map(i => i.storagePath)
```

O `product-quick-create` (quando implementado) receberá estes paths e criará os registos em `product_images` com as URLs completas.

Enquanto o `product-quick-create` nao estiver implementado (usa `useCreateProduct`), manter compatibilidade: converter paths para URLs públicas no frontend.

### 4. Registar em `supabase/config.toml`

```text
[functions.product-images-presign]
verify_jwt = false
```

## Detalhes técnicos

### Presigned URLs do Supabase Storage

O Supabase Storage suporta `createSignedUploadUrl` que retorna um URL + token válidos por um periodo limitado. O cliente faz PUT diretamente para esse URL sem precisar do Supabase client SDK.

Vantagens:
- Upload vai direto para o Storage (nao passa pela Edge Function)
- Edge Function apenas valida permissoes e gera os URLs
- Melhor performance em mobile (menos hops)
- Token expira automaticamente (segurança)

### Compatibilidade

Como o bucket `product-images` é público, as URLs públicas continuam a funcionar para exibicao. O presign é apenas para a operação de upload.

## Ficheiros criados/modificados

| Ficheiro | Acao |
|---|---|
| `supabase/functions/product-images-presign/index.ts` | Novo |
| `supabase/config.toml` | Modificado (nova entry) |
| `src/components/mqpc/MQPCStepImages.tsx` | Modificado (usar presigned URLs) |
| `src/components/mqpc/MQPCWizard.tsx` | Modificado (passar storage_paths) |

