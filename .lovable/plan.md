

# Corrigir processo de envio de mensagens em massa

## Problemas encontrados

### 1. Follow-ups nao sao agendados (BUG CRITICO)
O `BulkOutreachDialog` insere na tabela `prospecting_outreach_queue` com o campo `sequence_step`, mas a coluna real chama-se `step_index`. O `as any` esconde o erro de tipo e a insercao falha silenciosamente. Os follow-ups de Dia 3 e Dia 7 nunca sao criados.

### 2. Progresso nao actualiza durante geracao
A funcao `handleBulkOutreach` em `ProspectingResults.tsx` faz uma unica chamada ao edge function `batch-generate-prospecting-messages` e so actualiza o progresso no final. O dialog mostra "0/N" durante toda a geracao e depois salta para "N/N". O utilizador pensa que esta bloqueado.

### 3. Mensagens chegam todas de uma vez
As mensagens geradas sao definidas todas de uma vez com `setBulkOutreachMessages(data.results)`. O dialog fica vazio durante a geracao e depois mostra tudo de repente.

## Solucao

### Ficheiro 1: `BulkOutreachDialog.tsx` - Corrigir nome da coluna

Na funcao `markAsSent` (linha 126-141), alterar `sequence_step` para `step_index`:

```typescript
// ANTES (errado)
{ sequence_step: 2, ... }
{ sequence_step: 3, ... }

// DEPOIS (correcto)
{ step_index: 2, ... }
{ step_index: 3, ... }
```

Remover os `as any` para que erros de tipo sejam detectados no futuro.

### Ficheiro 2: `ProspectingResults.tsx` - Progresso incremental

Alterar `handleBulkOutreach` para processar os perfis em mini-batches (de 5 em 5) no frontend, em vez de enviar tudo numa unica chamada. Assim o progresso actualiza a cada batch:

```text
Batch 1 (5 perfis) -> actualiza progresso 5/20, adiciona mensagens
Batch 2 (5 perfis) -> actualiza progresso 10/20, adiciona mensagens
Batch 3 (5 perfis) -> actualiza progresso 15/20, adiciona mensagens
Batch 4 (5 perfis) -> actualiza progresso 20/20, adiciona mensagens
```

Cada batch usa a edge function `generate-prospecting-message` individual (ja existente) em vez do `batch-generate-prospecting-messages`, ou mantemos o batch mas com chunks menores.

A abordagem mais simples: manter a chamada ao `batch-generate-prospecting-messages` mas dividir os perfis em grupos de 5 no frontend e ir actualizando `bulkOutreachMessages` e `bulkGenerationProgress` incrementalmente.

### Resumo das alteracoes

| Ficheiro | Alteracao |
|---|---|
| `BulkOutreachDialog.tsx` | Corrigir `sequence_step` -> `step_index` na insercao dos follow-ups |
| `ProspectingResults.tsx` | Processar em mini-batches com progresso incremental e mensagens parciais |

