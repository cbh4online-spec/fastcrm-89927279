

# Refactoring: product-images-presign para contrato v2

## Resumo

A Edge Function `product-images-presign` atual aceita um body simples `{ count }` e retorna `{ uploads: [{ path, signedUrl, token }] }`. O novo contrato exige um body mais rico com metadata por ficheiro (`files[]` com `filename`, `content_type`, `size_bytes`, `sha256`) e um `context`, e a response segue um formato estruturado com `success`, `data`, e `meta`.

## Alteracoes

### 1. Edge Function `supabase/functions/product-images-presign/index.ts`

Reescrever para aceitar o novo contrato:

**Request body novo:**
```text
{
  "files": [
    { "filename": "produto-1.jpg", "content_type": "image/jpeg", "size_bytes": 483920, "sha256": "optional" }
  ],
  "context": { "channel": "mobile_quick", "intent": "product_create" }
}
```

**Validacoes novas:**
- `files` array obrigatorio, 1 a 6 elementos (VALIDATION_ERROR se exceder)
- Cada ficheiro: `content_type` deve comecar por `image/` (VALIDATION_ERROR)
- `size_bytes` obrigatorio e <= 8388608 (8MB) por ficheiro (VALIDATION_ERROR)
- `filename` obrigatorio e nao vazio

**Path novo:** `workspaces/{workspaceId}/products/tmp/{file_id}.jpg` (onde `file_id` e um UUID gerado server-side)

**Response nova (200):**
```text
{
  "success": true,
  "data": {
    "bucket": "product-images",
    "uploads": [
      {
        "file_id": "<uuid>",
        "storage_path": "workspaces/<workspace_id>/products/tmp/<file_id>.jpg",
        "signed_upload_url": "https://...",
        "public_url": "https://.../object/public/product-images/workspaces/...",
        "expires_in_seconds": 600
      }
    ]
  },
  "meta": {
    "request_id": "<uuid>",
    "workspace_id": "<uuid>",
    "timestamp": "<ISO 8601>"
  }
}
```

**Respostas de erro:**
- 401: `{ "success": false, "error": "UNAUTHORIZED", "message": "..." }`
- 403: `{ "success": false, "error": "FORBIDDEN", "message": "Not a member of this workspace" }`
- 400: `{ "success": false, "error": "VALIDATION_ERROR", "message": "..." }`
- 500: `{ "success": false, "error": "INTERNAL_ERROR", "message": "..." }`

### 2. `src/components/mqpc/MQPCStepImages.tsx`

Atualizar o cliente para enviar o novo formato e consumir a nova response:

**Interface `PresignedUpload` atualizada:**
```text
interface PresignedUpload {
  file_id: string;
  storage_path: string;
  signed_upload_url: string;
  public_url: string;
  expires_in_seconds: number;
}
```

**Funcao `requestPresignedUrls` atualizada:**
- Aceita array de `{ filename, content_type, size_bytes }` em vez de `count`
- Envia body com `files[]` e `context: { channel: "mobile_quick", intent: "product_create" }`
- Le resposta de `data.data.uploads` (porque `supabase.functions.invoke` faz parse do JSON exterior)

**Funcao `uploadToSignedUrl`:**
- Usa `presigned.signed_upload_url` em vez de `presigned.signedUrl`

**Funcao `buildPublicUrl` removida:**
- A public_url ja vem na response do server

**`uploadSingleImage` atualizado:**
- Usa `presigned.public_url` diretamente
- Usa `presigned.storage_path` para o campo `storagePath`

**`handleFilesWithRef` atualizado:**
- Antes de pedir presigned URLs, obter o tamanho de cada ficheiro via `file.size`
- Construir o array `files[]` com `filename: file.name`, `content_type: "image/jpeg"`, `size_bytes: file.size`

### 3. `src/components/mqpc/MQPCWizard.tsx`

Sem alteracoes - ja usa `storagePath` dos ImageItems, que continua a ser preenchido.

## Ficheiros modificados

| Ficheiro | Acao |
|---|---|
| `supabase/functions/product-images-presign/index.ts` | Modificado (novo contrato request/response) |
| `src/components/mqpc/MQPCStepImages.tsx` | Modificado (adaptar ao novo contrato) |
