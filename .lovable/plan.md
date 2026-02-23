

# Tracking Analytics para MQPC

## Resumo

Adicionar 7 eventos de tracking ao sistema de analytics privacy-first existente (`useCRMAnalytics`) e integra-los nos componentes MQPC. Segue o mesmo padrao `safePush` -> dataLayer/GTM ja usado nos modulos Inbox, CRM, Templates, etc.

## Alteracoes

### 1. `src/hooks/useCRMAnalytics.ts` -- Adicionar seccao ECOMMERCE / MQPC

Nova seccao no hook com 7 funcoes de tracking:

```text
// ECOMMERCE / MQPC

trackMQPCOpen()
  -> push('mqpc.open', { device_type })

trackMQPCImageUploadSuccess(data: { images_count: number })
  -> push('mqpc.image_upload_success', { images_count })

trackMQPCCreatedDraft(data: { images_count, has_ai, category_id, channel })
  -> push('mqpc.created_draft', { images_count, has_ai, category_id, channel })

trackMQPCCreatedActive(data: { images_count, has_ai, category_id, channel })
  -> push('mqpc.created_active', { images_count, has_ai, category_id, channel })

trackMQPCAIImproveClicked()
  -> push('mqpc.ai_improve_clicked', { device_type })

trackMQPCAIImproveSuccess()
  -> push('mqpc.ai_improve_success', { device_type })

trackMQPCPublishClicked(data: { product_id })
  -> push('mqpc.publish_clicked', { product_id })
```

Todas as funcoes seguem o padrao `useCallback` + `push` existente. Os valores sao seguros (contadores, IDs, booleans) -- sem PII.

### 2. `src/components/mqpc/MQPCFloatingButton.tsx` -- Evento `mqpc_open`

- Importar `useCRMAnalytics`
- No `onClick`, chamar `trackMQPCOpen()` antes de navegar

### 3. `src/components/mqpc/MQPCStepImages.tsx` -- Evento `mqpc_image_upload_success`

- Importar `useCRMAnalytics`
- Apos upload bem-sucedido de uma imagem, chamar `trackMQPCImageUploadSuccess({ images_count })` com o total de imagens atual

### 4. `src/components/mqpc/MQPCWizard.tsx` -- Eventos `mqpc_created_draft` / `mqpc_created_active`

- Importar `useCRMAnalytics`
- Apos `data.success` no `handleCreate`, chamar:
  - `trackMQPCCreatedDraft(...)` se status = draft
  - `trackMQPCCreatedActive(...)` se status = active
- Payload: `{ images_count: images.length, has_ai: !!extras.shortDescription, category_id: details.categoryId, channel: "mobile_quick" }`

### 5. `src/components/mqpc/MQPCStepExtras.tsx` -- Eventos `mqpc_ai_improve_clicked` / `mqpc_ai_improve_success`

- Importar `useCRMAnalytics`
- No inicio de `handleAIImprove`, chamar `trackMQPCAIImproveClicked()`
- Apos sucesso (`setAiDone(true)`), chamar `trackMQPCAIImproveSuccess()`

### 6. Evento `mqpc_publish_clicked` (integracao futura)

Este evento sera usado quando o botao de publicacao pos-criacao for implementado (via `useProductPublish`). Por agora, a funcao `trackMQPCPublishClicked` fica disponivel no hook para uso futuro.

## Ficheiros modificados

| Ficheiro | Acao |
|---|---|
| `src/hooks/useCRMAnalytics.ts` | Modificado (nova seccao MQPC com 7 trackers) |
| `src/components/mqpc/MQPCFloatingButton.tsx` | Modificado (tracking mqpc_open) |
| `src/components/mqpc/MQPCStepImages.tsx` | Modificado (tracking image_upload_success) |
| `src/components/mqpc/MQPCWizard.tsx` | Modificado (tracking created_draft / created_active) |
| `src/components/mqpc/MQPCStepExtras.tsx` | Modificado (tracking ai_improve_clicked / ai_improve_success) |

