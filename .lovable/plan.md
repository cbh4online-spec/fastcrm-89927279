

## Cron Job a cada 5 segundos

### Limitacao Importante

O `pg_cron` (usado na base de dados) so suporta granularidade minima de **1 minuto**. Nao e possivel agendar tarefas a cada 5 segundos com `pg_cron`.

### Solucao: Loop interno na Edge Function

A abordagem e criar uma Edge Function que, quando invocada pelo cron a cada minuto, executa internamente um loop com 12 iteracoes (60s / 5s = 12), fazendo o sync a cada 5 segundos durante esse minuto.

### Alteracoes

**1. Modificar `supabase/functions/cron-sync-messages/index.ts`**

Envolver a logica de sync existente num loop que executa 12 vezes com intervalos de 5 segundos:

```text
// Pseudocodigo
for (let i = 0; i < 12; i++) {
  await syncAllWorkspaces();  // logica existente
  if (i < 11) {
    await new Promise(r => setTimeout(r, 5000)); // esperar 5s
  }
}
```

Isto garante que durante cada invocacao do cron (1x por minuto), o sync corre efetivamente a cada 5 segundos.

**2. Manter o cron job existente**

O agendamento `pg_cron` a cada 1 minuto ja esta configurado e continua igual. A diferenca e que cada execucao agora faz 12 verificacoes internas.

### Consideracoes

- Edge Functions tem timeout maximo de ~60 segundos, o que se alinha com 12 iteracoes de 5 segundos
- Se uma iteracao demorar mais que 5 segundos, o intervalo efetivo sera maior mas nao ha sobreposicao
- O consumo de recursos sera ~12x maior que a versao atual

