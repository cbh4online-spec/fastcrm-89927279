

# analytics_events -- Tracking ja integrado no fluxo actual

## Analise

O tracking de analytics para criacao de produtos via MQPC ja esta completamente implementado atraves do hook `useCRMAnalytics`:

### Eventos existentes no `MQPCWizard.tsx`

| Evento | Quando dispara |
|---|---|
| `mqpc.created_draft` | Produto criado com `publishNow = false` |
| `mqpc.created_active` | Produto criado com `publishNow = true` |

### Payload actual (em `useCRMAnalytics.ts`, linhas 297-308)

```text
{
  images_count: number,
  has_ai: boolean,
  category_id: string,
  channel: string
}
```

### Mapeamento com os campos pedidos

| Campo pedido | Estado actual |
|---|---|
| `event` = mqpc_created_draft/active | Ja existe como `mqpc.created_draft` / `mqpc.created_active` |
| `workspace_id` | Injectado automaticamente pelo `useSafePush` (via contexto) |
| `user_id` | Nao enviado por design (privacy-first -- sem PII no dataLayer) |
| `entity_type` / `entity_id` | Nao incluidos no payload analytics (existem no audit log em `crm_activities`) |
| `properties.images_count` | Ja incluido |
| `properties.has_ai` | Ja incluido |
| `properties.category_id` | Ja incluido |
| `properties.channel` | Ja incluido |
| `created_at` | Adicionado automaticamente como `event_timestamp` pelo `safePush` |

### Sobre `entity_type`/`entity_id` e `user_id`

Estes campos nao sao incluidos no analytics propositadamente:

- **`user_id`**: O sistema de analytics e privacy-first -- nenhum identificador pessoal e enviado para o GTM/Clarity. O `sanitizeEventData` em `analyticsHelpers.ts` bloqueia campos PII.
- **`entity_type`/`entity_id`**: O `product_id` e um identificador que poderia ser correlacionado com dados pessoais. O rastreio por entidade ja e feito no audit log (`crm_activities`), que e interno e protegido por RLS.

## Resultado

**Nenhuma alteracao necessaria.** O tracking analytics ja cobre o caso de uso com a separacao correcta:

- **Analytics (GTM/Clarity)**: Eventos anonimizados com metricas agregaveis (`images_count`, `has_ai`, `category_id`, `channel`)
- **Audit log (crm_activities)**: Registo completo com `entity_id`, `user_id`, `workspace_id`, `metadata`

## Ficheiros a modificar

Nenhum.

