

# Status das Correções de Persistência GHL e Email

## Já Implementado (código actual)

Todas as correções de código do plano **já estão aplicadas**:

1. **`ghl-sync-conversations/index.ts`** — Usa prefixo `ghl_` (linha 520), paginação de dedup (linhas 391-406), lookup dual-format (linhas 384-388)
2. **`cron-sync-messages/index.ts`** — Usa `ghl_${ghlConvId}` (linha 296), verifica ambos formatos (linhas 297-299), janela de 24h (linha 220)
3. **`email-fetch/index.ts`** — Deduplicação por `email_message_id` antes de inserir (linhas 605-617)

## Pendente: Migração de Dados

Existem **46 conversas** com `external_thread_id` raw (sem prefixo `ghl_`) que têm mensagens associadas. Nenhuma tem duplicata com prefixo — logo não há risco de conflito.

### Acção necessária

Executar um UPDATE para normalizar os thread IDs existentes:

```sql
UPDATE conversations
SET external_thread_id = 'ghl_' || external_thread_id
WHERE external_thread_id IS NOT NULL
  AND external_thread_id NOT LIKE 'ghl_%'
  AND channel NOT IN ('email')
  AND LENGTH(external_thread_id) > 10;
```

Isto garante que futuras syncs não criem conversas duplicadas para estes contactos.

### Impacto
- **46 conversas** actualizadas (com ~200+ mensagens preservadas)
- **Zero risco** de perda de dados — apenas prefixo adicionado ao thread ID
- **Sem alteração de código** necessária — o código já está correcto

