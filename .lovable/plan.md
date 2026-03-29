

# Validar sequência de emails + melhorias para módulo de sucesso

## Problemas identificados

### 1. pg_cron NÃO foi configurado para o `funnel-nurture-processor`
O processador de nurture existe como Edge Function, mas **nunca é executado** porque não há nenhum job pg_cron agendado para o invocar. Os leads são inseridos na `funnel_nurture_queue` mas os emails de Dia 2, 4 e 7 nunca são enviados.

### 2. Edge Function `funnel-nurture-processor` não foi deployed
A função precisa de ser deployed para estar acessível.

### 3. Sem dashboard de gestão da sequência de nurture
Não existe nenhuma UI para visualizar leads na fila, cancelar nurtures, ou ver o estado da sequência.

### 4. Sem possibilidade de cancelamento (unsubscribe do nurture)
Se um lead agenda reunião ou pede para sair, não há mecanismo para o remover da fila.

## Plano de implementação

### Passo 1 — Deploy + pg_cron do nurture processor
- Deploy da Edge Function `funnel-nurture-processor`
- Criar job pg_cron para invocar a função a cada 30 minutos

### Passo 2 — Teste com jorge.cardoso@digital4ads.pt
- Inserir manualmente um registo na `funnel_nurture_queue` com `next_send_at = now()` para disparar os 5 templates de imediato (agradecimento, convite reunião, e os 3 de nurture) para o email indicado
- Verificar logs de envio na `email_send_log`

### Passo 3 — Dashboard de gestão do nurture
Criar uma secção no dashboard de marketing (ou funis) para:
- Ver leads na fila de nurture (email, step atual, próximo envio, estado)
- Cancelar/pausar nurture de um lead específico
- Ver histórico de emails enviados por lead
- Estatísticas: total pendentes, completados, cancelados

### Passo 4 — Cancelamento automático
- Quando um lead agenda reunião ou converte, marcar `status = 'cancelled'` na fila
- Respeitar unsubscribes: se o lead faz unsubscribe dos emails transacionais, cancelar o nurture

### Passo 5 — Melhorias de experiência
- Personalizar os CTAs dos templates com links dinâmicos do workspace (ex: link de agendamento real via Calendly/Cal)
- Adicionar campo `meeting_url` configurável por funil nas definições do funil
- Log de atividade no timeline do lead/contacto no CRM

## Ficheiros alterados/criados

| Ficheiro | Alteração |
|---|---|
| pg_cron (SQL insert) | Agendar `funnel-nurture-processor` a cada 30min |
| `funnel-nurture-processor` | Deploy |
| `send-transactional-email` | Redeploy (já tem os templates) |
| Nova página/componente nurture dashboard | Dashboard de gestão |
| `PublicFunnelPage.tsx` | Melhorias opcionais (meeting_url dinâmico) |

