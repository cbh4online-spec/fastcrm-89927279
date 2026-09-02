# Corrigir bloqueio ao marcar contactos como validados (WhatsApp)

## Diagnóstico (verificado na base de dados)

A tabela `outreach_validations` tem uma única política RLS (`outreach_validations_members`) que chama a função de verificação de pertença ao workspace **com os argumentos trocados**:

```text
política:  is_workspace_member(workspace_id, auth.uid())
função:    is_workspace_member(_user_id uuid, _workspace_id uuid)
```

Ou seja, a função recebe o `workspace_id` no lugar do `user_id`. O teste de super admin e a procura em `workspace_members` falham sempre, pelo que **nenhum utilizador** consegue inserir ou atualizar validações — daí o erro "new row violates row-level security policy".

As permissões (GRANTs) da tabela estão corretas; o problema é apenas a ordem dos argumentos.

O mesmo erro existe em várias outras políticas criadas com o mesmo padrão, nomeadamente nas restantes tabelas do módulo de contacto validado (`outreach_settings`, `outreach_drafts`, `outreach_events`, `outreach_suppressions`, `outreach_channel_links`, `outreach_send_attempts`) e ainda em `whatsapp_consents`, `whatsapp_consent_links`, `whatsapp_consent_import_batches`, `whatsapp_mcp_requests`, `whatsapp_zapi_connections`, `whatsapp_webhook_logs`, `storage_upload_intents`, `pitch_shares`, `ebooks` e `ebook_generation_jobs`.

## O que vai ser feito

1. **Migration de correção de políticas**: recriar todas as políticas afetadas com a ordem correta `is_workspace_member(auth.uid(), workspace_id)`, mantendo exatamente o mesmo âmbito (comando, roles, condições adicionais como `created_by = auth.uid()` ou o bypass de super admin). Sem alargar permissões.
2. **Levantamento completo antes de aplicar**: enumerar via catálogo todas as políticas com o padrão invertido, para não deixar nenhuma para trás nem alterar políticas corretas.
3. **Validação**:
   - Confirmar que já não existem políticas com o padrão invertido.
   - Marcar um contacto como validado na interface e confirmar que grava, e que o evento correspondente é registado.
   - Testar isolamento: um utilizador de outro workspace não consegue ler nem escrever nessas linhas.
   - Correr o linter de segurança.

## Nota

Não é preciso alterar o frontend: `useSaveOutreachValidation` já envia `workspace_id`, `entity_type`, `entity_id` e `validated_by` corretos. A falha é exclusivamente de política na base de dados.
