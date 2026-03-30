

# Corrigir filtro "Enviado" — faltam conversas de todos os canais

## Diagnóstico
A coluna `last_message_direction` na tabela `conversations` foi criada e preenchida apenas **uma vez** via migração de backfill. **Não existe nenhum trigger** que actualize este campo quando uma nova mensagem é inserida. Resultado: apenas conversas que já tinham a última mensagem outbound no momento do backfill (maioritariamente Instagram/GHL) aparecem nos "Enviados". Emails, WhatsApp e outros canais enviados após o backfill nunca actualizam `last_message_direction`.

Já existe o trigger `trg_increment_unread` que actualiza `unread_count` em INSERT — basta criar um trigger análogo para `last_message_direction`.

## Alterações

### 1. Criar trigger para actualizar `last_message_direction` (migração SQL)
- Criar função `update_conversation_last_message_direction()` que, em cada INSERT na tabela `messages`, faz UPDATE à conversa correspondente com `last_message_direction = NEW.direction`
- Actualiza também `last_message_at` e `last_message_preview` no mesmo trigger para manter consistência (actualmente estes campos também podem ficar desactualizados)
- Criar trigger `trg_update_last_message_direction` AFTER INSERT ON `messages`

### 2. Re-backfill dos dados existentes
- Na mesma migração, executar UPDATE para recalcular `last_message_direction` de todas as conversas com base na mensagem mais recente (mesmo SQL do backfill original)

### Ficheiros
| Ficheiro | Alteração |
|---|---|
| Nova migração SQL | Trigger + backfill para `last_message_direction`, `last_message_at`, `last_message_preview` |

### Resultado esperado
- Todas as conversas onde a última mensagem foi enviada (outbound) — de qualquer canal — aparecem na pasta "Enviado"
- O campo mantém-se automaticamente actualizado para mensagens futuras

