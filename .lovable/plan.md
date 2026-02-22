
# Automatizar Sequencia AIDA de Prospeccao

## Problema

Actualmente o utilizador precisa de lembrar-se de voltar ao CRM nos Dias 3 e 7 para enviar as mensagens de follow-up e fecho. Isso nao e "fast".

## Solucao

Quando o utilizador envia a Msg 1 (Abertura), o sistema agenda automaticamente as mensagens 2 e 3 com as datas correctas. Uma fila de outreach guarda os agendamentos e uma funcao backend processa a fila, pre-gerando as mensagens e criando notificacoes. O utilizador recebe um lembrete e envia com um clique.

## Alteracoes

### 1. Nova tabela `prospecting_outreach_queue`

Tabela para agendar follow-ups automaticos:

```text
id             uuid PK
workspace_id   uuid NOT NULL FK
profile_id     uuid NOT NULL FK -> professional_prospecting_profiles
step_index     integer NOT NULL (1=follow-up, 2=fecho)
status         text DEFAULT 'scheduled' (scheduled/ready/sent/cancelled)
scheduled_for  timestamptz NOT NULL
message        text (mensagem pre-gerada, preenchida pelo scheduler)
message_plain  text
tone           text
created_at     timestamptz DEFAULT now()
updated_at     timestamptz DEFAULT now()
```

RLS: utilizadores do workspace podem ler/actualizar os seus registos.

### 2. Logica ao enviar Msg 1

No `ProspectingMessageDialog`, quando o utilizador clica "Enviar no Instagram" na Msg 1:
- Guardar as mensagens ja geradas (Msg 2 e Msg 3) directamente na fila
- Agendar Msg 2 para daqui a 3 dias, Msg 3 para daqui a 7 dias
- Mostrar toast: "Sequencia activada! Follow-up em 3 dias, Fecho em 7 dias"

Isto e feito no proprio componente via insert no Supabase, sem precisar de edge function para agendar (as mensagens ja estao geradas no dialog).

### 3. Edge Function `prospecting-outreach-processor`

Funcao chamada por cron que:
- Busca items da fila com `status = 'scheduled'` e `scheduled_for <= now()`
- Marca como `status = 'ready'`
- Cria uma notificacao interna (insert em `admin_notifications`) a avisar o utilizador que e hora de enviar

### 4. Cron Job

Configurar pg_cron para chamar `prospecting-outreach-processor` a cada 30 minutos.

### 5. Painel de Outreach Pendente na pagina de Prospeccao

Adicionar uma seccao no topo da pagina `ProfessionalProspecting.tsx` que mostra:
- Cards com follow-ups prontos para enviar (`status = 'ready'`)
- Cada card mostra: nome do perfil, mensagem pre-gerada, botao "Enviar agora"
- Ao clicar "Enviar agora": copia mensagem, abre Instagram, marca como `sent`, actualiza `outreach_step`
- Contador: "2 follow-ups pendentes hoje"

### 6. Cancelamento automatico

Se o perfil for convertido a lead ou rejeitado, cancelar automaticamente os outreach pendentes.

## Ficheiros a criar/modificar

- **SQL migration**: criar tabela `prospecting_outreach_queue` com RLS
- **`supabase/functions/prospecting-outreach-processor/index.ts`**: nova edge function
- **`supabase/config.toml`**: adicionar config da nova funcao
- **SQL (insert tool)**: criar cron job
- **`src/components/professional-prospecting/ProspectingMessageDialog.tsx`**: ao enviar Msg 1, inserir Msg 2 e 3 na fila
- **`src/pages/ProfessionalProspecting.tsx`**: adicionar seccao de outreach pendente
- **`src/components/professional-prospecting/PendingOutreachPanel.tsx`**: novo componente para mostrar follow-ups prontos

## Fluxo automatizado

```text
Utilizador envia Msg 1
       |
       v
Sistema guarda Msg 2 (Dia +3) e Msg 3 (Dia +7) na fila
       |
       v
Cron cada 30 min verifica fila
       |
       v
Quando chega o dia -> marca "ready" + cria notificacao
       |
       v
Utilizador ve painel "2 follow-ups pendentes"
       |
       v
Clica "Enviar agora" -> copia + abre Instagram -> done
```
