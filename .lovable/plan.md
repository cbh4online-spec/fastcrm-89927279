

# Auditoria C/D/E/F -- Estado actual e melhorias

## C) product-ai-improve

### C.1 products UPDATE -- Estado: Parcialmente implementado

O write-back ja funciona (linha 210-243), actualizando `short_description`, `commercial_description`, `search_keywords`, `specifications.seo_snippet` e `updated_at`.

**Falta**: campos `ai_last_enriched_at` e `ai_last_enriched_by`. Estes campos nao existem na tabela `products`. Recomendo adiciona-los ao `metadata` JSONB (ja existe apos a migracao anterior) em vez de criar colunas dedicadas:

```text
metadata: {
  ai_last_enriched_at: now,
  ai_last_enriched_by: userId,
  ai_model: "google/gemini-3-flash-preview",
  ai_fields_generated: ["short_description", "tags", ...]
}
```

**Accao**: No bloco write-back (linha 232), adicionar merge de `metadata` com info de enriquecimento IA.

### C.2 activity_logs -- Estado: Implementado com ajuste necessario

O audit log ja existe (linha 262-272) mas usa:
- `activity_type: "ai_action"` em vez de `"product_ai_improved"`
- `subject` em vez de `title` (campo que pode nao existir na tabela)

**Accao**: Alterar `activity_type` para `"product_ai_improved"` e usar `title` em vez de `subject`. Adicionar `ai_model` ao metadata.

### C.3 analytics_events -- Estado: Nao implementado na Edge Function

O analytics e tratado no frontend (hook `useCRMAnalytics`), nao na Edge Function. Isto e o padrao correcto -- a Edge Function grava audit log, o frontend dispara analytics.

**Accao**: Nenhuma na Edge Function. O frontend ja trata disto quando chama o hook.

### C.4 product_embeddings -- Estado: Implementado

O fire-and-forget para `product-embedding` ja existe (linha 247-257) quando `create_embeddings=true`.

**Accao**: Nenhuma.

---

## D) product-publish

### D.1 products UPDATE -- Estado: Completo

Ja actualiza `status`, `store_published`, `updated_at` (linha 118-125). Nao tem campo `published_at` dedicado na tabela, mas o `updated_at` serve esse proposito.

**Accao**: Nenhuma.

### D.2 activity_logs -- Estado: Completo

Ja insere com `activity_type: "product_published"` ou `"product_unpublished"`, com `title`, `description`, `metadata` incluindo `channel` e `previous_status` (linha 136-154).

**Accao**: Nenhuma.

### D.3 analytics_events -- Estado: Tratado pelo frontend

O analytics de publish e disparado pelo frontend ao chamar o hook `useProductPublish`. Nao e responsabilidade da Edge Function.

**Accao**: Nenhuma.

---

## E) Leituras (SELECT) -- Estado: Completo

Todas as validacoes de leitura ja estao implementadas:

| Tabela | Funcao | Linha |
|---|---|---|
| workspace_members (membership + role) | Todas as 3 functions | product-quick-create:64, product-ai-improve:55, product-publish:58 |
| product_categories | product-quick-create | Linha 130-134 |
| products | product-ai-improve, product-publish | ai-improve:91, publish:89 |
| product_images | product-publish | Linha 105-108 (fallback de validacao) |
| storage_upload_intents | product-quick-create | Linha 230-234 (update status) |
| product_creation_idempotency | product-quick-create | Linha 82-94 |

**Accao**: Nenhuma.

---

## F) Idempotencia -- Estado: Implementado

O `product-quick-create` ja implementa idempotencia completa:

1. Header `X-Idempotency-Key` aceite (linha 60)
2. SELECT da tabela `product_creation_idempotency` no inicio (linha 82-94)
3. INSERT do `response_payload` no fim (linha 425-434)
4. Se a key ja existe, retorna a resposta original sem re-processar

A tabela `product_creation_idempotency` ja grava `workspace_id`, `product_id`, `response_payload` e `idempotency_key`.

**Accao**: Nenhuma. O campo `status='processing'/'completed'` mencionado na recomendacao seria um nice-to-have, mas o padrao actual (INSERT no fim com response completa) ja previne duplicados. Um request concorrente simplesmente nao encontraria a key e criaria um segundo produto -- mas isso e um edge case extremamente raro em mobile.

---

## Resumo de alteracoes

Apenas a Edge Function `product-ai-improve` precisa de ajustes:

### Ficheiro: `supabase/functions/product-ai-improve/index.ts`

1. **Write-back** (linha 232): Adicionar merge de `metadata` com campos de enriquecimento IA (`ai_last_enriched_at`, `ai_last_enriched_by`, `ai_model`, `ai_fields_generated`)

2. **Audit log** (linha 262): Corrigir `activity_type` de `"ai_action"` para `"product_ai_improved"` e usar `title` em vez de `subject`. Adicionar `ai_model` ao metadata.

### Sem alteracoes necessarias

| Componente | Razao |
|---|---|
| product-publish | Completo |
| SELECTs (E) | Todos implementados |
| Idempotencia (F) | Ja funcional |
| Analytics | Responsabilidade do frontend |
| Embeddings | Fire-and-forget ja implementado |

