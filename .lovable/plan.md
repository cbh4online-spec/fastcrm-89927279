

# Criar templates de email para funis: Agradecimento + Convite Reunião/Trial

## Contexto

O `PublicFunnelPage.tsx` já tem um fluxo de submissão de formulário (linha 156-203) que insere dados em `funnel_submissions` mas não envia nenhum email ao lead. A infraestrutura de email transacional já está configurada (edge function `send-transactional-email`, registry, queue).

## Alterações

### 1. Criar template `funnel-registration-thanks.tsx`

Novo ficheiro em `supabase/functions/_shared/transactional-email-templates/`:
- Email de agradecimento pelo registo no funil
- Props: `name`, `funnelName`
- Subject: "Obrigado pelo seu registo!"
- Estilo consistente com os templates existentes (gold/dark brand do fastcrm)
- CTA para visitar o site

### 2. Criar template `funnel-meeting-trial-invite.tsx`

Novo ficheiro em `supabase/functions/_shared/transactional-email-templates/`:
- Convite para agendar uma breve reunião e experimentar a solução (trial)
- Props: `name`, `funnelName`, `meetingUrl` (opcional, link para agendamento)
- Subject: "Convidamo-lo para uma reunião e trial gratuito"
- Secção com benefícios do trial
- Botão CTA "Agendar Reunião"
- Estilo consistente com os templates existentes

### 3. Registar os templates em `registry.ts`

Adicionar os dois novos imports e entradas no `TEMPLATES` map.

### 4. Integrar no `PublicFunnelPage.tsx`

No `handleFormSubmit`, após inserir com sucesso em `funnel_submissions`:
- Extrair o email do `formData` (procurar campo com type `email`)
- Extrair o nome (procurar campo com type `text` ou label "Nome")
- Chamar `supabase.functions.invoke('send-transactional-email')` duas vezes:
  - Template `funnel-registration-thanks` com `idempotencyKey: funnel-thanks-${submissionId}`
  - Template `funnel-meeting-trial-invite` com `idempotencyKey: funnel-meeting-${submissionId}` e delay (o segundo email pode ser enviado imediatamente ou com nota de que será enviado em breve)

### 5. Deploy das edge functions

Redeployar `send-transactional-email` para incluir os novos templates.

## Ficheiros alterados

| Ficheiro | Alteração |
|---|---|
| `supabase/functions/_shared/transactional-email-templates/funnel-registration-thanks.tsx` | Novo template |
| `supabase/functions/_shared/transactional-email-templates/funnel-meeting-trial-invite.tsx` | Novo template |
| `supabase/functions/_shared/transactional-email-templates/registry.ts` | Registar 2 novos templates |
| `src/pages/PublicFunnelPage.tsx` | Enviar emails após submissão do formulário |

