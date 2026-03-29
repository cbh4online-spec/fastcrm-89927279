

# Fluxo automatizado de nurture para leads de funil

## Contexto

Atualmente, quando um lead submete o formulário do funil, recebe 2 emails imediatos (agradecimento + convite reunião). O pedido é criar uma sequência automatizada que, ao longo de vários dias, envie emails inteligentes para converter a lead em reunião/trial.

## Arquitetura

Uma fila de nurture dedicada (`funnel_nurture_queue`) com um processador cron que envia emails escalonados no tempo. Cada email é 1:1, despoletado pela ação original de registo do lead.

```text
Registo no Funil
  ├─ Email 0 (imediato): Agradecimento ✅ (já existe)
  ├─ Email 1 (imediato): Convite Reunião ✅ (já existe)  
  ├─ Email 2 (Dia 2): Valor + caso de uso
  ├─ Email 3 (Dia 4): Prova social + testemunho
  ├─ Email 4 (Dia 7): Última oportunidade trial
  └─ [para se lead agendar reunião → sai da fila]
```

## Alterações

### 1. Tabela `funnel_nurture_queue`

Nova tabela para rastrear em que passo cada lead está:
- `submission_id`, `funnel_id`, `workspace_id`, `recipient_email`, `recipient_name`
- `current_step` (0-2), `status` (pending/completed/cancelled)
- `next_send_at`, `funnel_name`
- RLS: anon pode inserir (via formulário público), workspace members podem ler/atualizar

### 2. Três novos templates de email

| Template | Dia | Objetivo |
|---|---|---|
| `funnel-nurture-value` | 2 | Mostrar valor concreto da solução, caso de uso |
| `funnel-nurture-social-proof` | 4 | Prova social, testemunhos, resultados reais |
| `funnel-nurture-last-chance` | 7 | Urgência, última oportunidade de trial gratuito |

Todos com estilo gold/dark consistente com os templates existentes.

### 3. Edge function `funnel-nurture-processor`

- Busca items da `funnel_nurture_queue` com `status=pending` e `next_send_at <= now()`
- Para cada item, envia o template correspondente ao `current_step` via `send-transactional-email`
- Avança `current_step` e calcula próximo `next_send_at` (delays: 2d, 2d, 3d)
- Quando chega ao último passo, marca `status=completed`

### 4. Agendar via pg_cron

Executar `funnel-nurture-processor` a cada 30 minutos.

### 5. Integrar no `PublicFunnelPage.tsx`

Após submissão bem-sucedida, inserir registo na `funnel_nurture_queue` com `next_send_at = now() + 2 dias` e `current_step = 0`.

### 6. Registar templates e deploy

Adicionar os 3 novos templates ao `registry.ts` e fazer deploy das edge functions.

## Ficheiros

| Ficheiro | Alteração |
|---|---|
| Migration SQL | Criar `funnel_nurture_queue` |
| `funnel-nurture-value.tsx` | Novo template (Dia 2) |
| `funnel-nurture-social-proof.tsx` | Novo template (Dia 4) |
| `funnel-nurture-last-chance.tsx` | Novo template (Dia 7) |
| `registry.ts` | Registar 3 novos templates |
| `funnel-nurture-processor/index.ts` | Nova edge function processadora |
| `PublicFunnelPage.tsx` | Inserir lead na fila de nurture |
| pg_cron | Agendar processamento a cada 30min |

