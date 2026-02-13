
## Fix: Autopilot Nao Responde + Simular Escrita

### Problema 1: Autopilot Bloqueado pelo Dedup

A mensagem do Jorge Cardoso as 18:27:13 nao obteve resposta porque:
- O trigger anterior foi as 18:26:10 (63s antes)
- A janela de dedup no webhook e de **120s** -- bloqueou
- A janela de dedup no cron e de **5 minutos** -- tambem bloqueou

O dedup esta correto para evitar duplicados do *mesmo* inbound, mas esta a bloquear *novos* inbounds legitimos que chegam dentro da janela.

### Problema 2: Sem Simulacao de Escrita

Quando o autopilot responde, a mensagem aparece instantaneamente. Deveria simular um tempo de escrita proporcional ao tamanho da resposta para parecer mais natural.

---

### Correcao 1: Refinar Logica de Dedup no Webhook

**Ficheiro**: `supabase/functions/ghl-webhook-message/index.ts`

Alterar a verificacao de dedup (linha 740) para ser mais inteligente: em vez de verificar apenas "triggered nos ultimos 120s", verificar se ja existe um trigger para o **mesmo inbound** (comparando o timestamp do ultimo inbound). Se houver um novo inbound depois do ultimo trigger, permitir novo trigger.

Logica: Buscar o ultimo evento "triggered" e verificar se existem mensagens inbound mais recentes que esse evento. Se sim, permitir o novo trigger.

### Correcao 2: Refinar Dedup no Cron

**Ficheiro**: `supabase/functions/cron-sync-messages/index.ts`

Mesma logica: em vez de bloquear por 5 minutos, verificar se o ultimo trigger ja cobriu o ultimo inbound. Se houver inbounds novos apos o ultimo trigger, permitir.

### Correcao 3: Simular Escrita (Typing Delay)

**Ficheiro**: `supabase/functions/ghl-webhook-message/index.ts`

Apos gerar a resposta AI (linha 949) e antes de enviar (linha 952), adicionar um delay proporcional ao tamanho da mensagem para simular tempo de escrita:

- Base: 1-2 segundos (tempo de "ler" a mensagem)
- Escrita: ~30-50 caracteres por segundo (velocidade de digitacao humana)
- Maximo: 8 segundos (para nao ser demasiado lento)
- Exemplo: resposta de 200 caracteres = 2s base + 4s escrita = 6s total

Isto combina com o delay inicial (8-12s antes de "comecar a escrever") para criar um comportamento natural: recebe mensagem -> espera 8-12s -> "escreve" durante 3-6s -> envia.

### Detalhe Tecnico

| Ficheiro | Alteracao |
|----------|-----------|
| `supabase/functions/ghl-webhook-message/index.ts` | Dedup inteligente: verificar se ha inbound novo apos ultimo trigger |
| `supabase/functions/ghl-webhook-message/index.ts` | Typing delay proporcional ao tamanho da resposta antes do envio |
| `supabase/functions/cron-sync-messages/index.ts` | Dedup inteligente: mesma logica do webhook |

### Resultado Esperado

- Cada novo inbound gera exactamente 1 resposta do autopilot (mesmo se chegar 30s apos o anterior)
- A resposta aparece com um delay natural que simula escrita humana
- Duplicados continuam prevenidos (mesmo inbound nao dispara 2x)
