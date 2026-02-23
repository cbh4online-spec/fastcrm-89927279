

# Storage Upload Intents -- Rastreio de uploads no presign

## Resumo

Criar a tabela `storage_upload_intents` e integra-la na Edge Function `product-images-presign` para registar cada presigned URL emitida. Isto permite rastrear uploads pendentes, expirados e concluidos, reduzindo erros e duplicacoes em redes moveis.

## Alteracoes

### 1. Migration: Criar tabela `storage_upload_intents`

```text
CREATE TABLE public.storage_upload_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  bucket TEXT NOT NULL DEFAULT 'product-images',
  storage_path_tmp TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'uploaded', 'expired', 'promoted')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_upload_intents_workspace ON public.storage_upload_intents(workspace_id);
CREATE INDEX idx_upload_intents_status ON public.storage_upload_intents(status, expires_at);
```

**RLS:** Habilitado com policies para membros do workspace (SELECT, UPDATE do status).

### 2. Modificar `supabase/functions/product-images-presign/index.ts`

Apos gerar cada presigned URL, inserir um registo na tabela:

```text
// Para cada ficheiro, apos createSignedUploadUrl:
await adminClient
  .from("storage_upload_intents")
  .insert({
    id: fileId,
    workspace_id: workspaceId,
    user_id: userId,
    bucket: "product-images",
    storage_path_tmp: storagePath,
    content_type: files[i].content_type,
    size_bytes: files[i].size_bytes,
    status: "issued",
    expires_at: new Date(Date.now() + 600_000).toISOString(), // 10 min
  });
```

Nao bloqueia o fluxo se o INSERT falhar (log de warning, continua normalmente).

### 3. Modificar `src/components/mqpc/MQPCStepImages.tsx` (opcional)

Apos upload bem-sucedido de cada imagem, atualizar o intent para `status = 'uploaded'`:

```text
await supabase
  .from("storage_upload_intents")
  .update({ status: "uploaded", updated_at: new Date().toISOString() })
  .eq("id", fileId);
```

Isto e fire-and-forget (sem await bloqueante no fluxo principal). Permite saber quais URLs foram efetivamente usadas.

## Detalhes tecnicos

### Ciclo de vida do status

```text
issued --> uploaded --> promoted
  |
  +--> expired (cleanup futuro)
```

- **issued**: presigned URL gerada, aguarda upload do client
- **uploaded**: client confirmou upload bem-sucedido
- **promoted**: imagem movida de `tmp/` para path final (feito pelo `product-quick-create`)
- **expired**: limpeza periodica futura (intents com `expires_at < now()` e status = 'issued')

### RLS Policies

- SELECT: membros do workspace podem ver os seus intents
- UPDATE: membros do workspace podem atualizar status (apenas de 'issued' para 'uploaded')
- INSERT: apenas via service role (Edge Function)
- DELETE: nenhum (cleanup via job futuro ou soft-delete)

### Impacto no fluxo existente

- O `product-quick-create` ja move ficheiros de `tmp/` para o path final. Pode opcionalmente atualizar o intent para `status = 'promoted'` (melhoria futura, nao incluida agora).
- O presign continua a funcionar normalmente mesmo se o INSERT na tabela falhar (graceful degradation).

## Ficheiros criados/modificados

| Ficheiro | Acao |
|---|---|
| Migration SQL | Nova tabela `storage_upload_intents` + RLS + indices |
| `supabase/functions/product-images-presign/index.ts` | Modificado (INSERT apos presign) |
| `src/components/mqpc/MQPCStepImages.tsx` | Modificado (UPDATE status apos upload, fire-and-forget) |

