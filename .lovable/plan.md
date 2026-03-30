

## Envio Real de Emails de Recuperação — Plano

### Diagnóstico

O `process-store-recovery` já processa steps de sequências, resolve merge variables e avança enrollments — mas **não envia emails**. Apenas regista o step em `store_automation_events`. O sistema de email transacional (`send-transactional-email`) já existe e é usado pelo `funnel-nurture-processor` com o mesmo padrão (fetch direto entre edge functions).

**O que falta:**
1. Template React Email para recuperação de carrinho (genérico, com props para subject/body dinâmicos)
2. Invocação real do `send-transactional-email` dentro do `process-store-recovery`

### Abordagem

Como os recovery emails usam subject/body custom definidos nos `email_sequence_steps` (com merge variables `{{contact_name}}`, `{{cart_total}}`, `{{recovery_link}}`), o template precisa aceitar HTML pré-resolvido como prop — não pode ser estático.

### Plano

#### 1. Criar template `cart-recovery.tsx`

Ficheiro: `supabase/functions/_shared/transactional-email-templates/cart-recovery.tsx`

- Props: `subject`, `bodyHtml` (HTML já resolvido com variáveis), `storeName`
- O componente renderiza o `bodyHtml` dentro de um container branded
- Usa `dangerouslySetInnerHTML` controlado (o HTML vem do step.body resolvido internamente, não de input do utilizador)
- Subject dinâmico via função

#### 2. Registar no registry

Adicionar `cart-recovery` ao `TEMPLATES` em `registry.ts`.

#### 3. Alterar `process-store-recovery/index.ts`

Após resolver as merge variables e antes de avançar o step:
1. Resolver `{{variáveis}}` no subject e body do step
2. Invocar `send-transactional-email` via fetch (mesmo padrão do `funnel-nurture-processor`)
3. Registar sucesso/falha no `store_automation_events`
4. Só avançar o step se o envio foi bem sucedido

### Ficheiros

| Acção | Ficheiro |
|-------|----------|
| Criar | `supabase/functions/_shared/transactional-email-templates/cart-recovery.tsx` |
| Editar | `supabase/functions/_shared/transactional-email-templates/registry.ts` |
| Editar | `supabase/functions/process-store-recovery/index.ts` |

Deploy necessário: `send-transactional-email`, `process-store-recovery`.

Sem migrations.

