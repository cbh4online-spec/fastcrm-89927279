
# Configuração GHL para Workspace Blecksen

## Objetivo
Adicionar a configuração do GoHighLevel ao workspace Blecksen de forma silenciosa, sem que o cliente veja o processo.

## Ação a Executar

Inserir um novo registo na tabela `workspace_ghl_config` com os seguintes dados:

| Campo | Valor |
|-------|-------|
| workspace_id | `6d108e84-389c-42de-bd19-277f210823f2` |
| ghl_location_id | `n7zf5LsV9k9vm4U3Exvt` |
| ghl_api_key_encrypted | `pit-81936628-1094-4ce0-93f6-792503500f56` |
| is_active | `true` |
| sync_contacts | `true` |
| sync_messages | `true` |

## Resultado Esperado

Após a inserção:
1. O workspace Blecksen terá a integração GHL ativa
2. Os webhooks do GHL poderão criar/atualizar contactos e conversas
3. A sincronização de contactos e conversas estará disponível
4. O Auto-Pilot poderá responder a mensagens vindas do GHL

## Secção Técnica

```sql
INSERT INTO workspace_ghl_config (
  workspace_id,
  ghl_location_id,
  ghl_api_key_encrypted,
  is_active,
  sync_contacts,
  sync_messages
) VALUES (
  '6d108e84-389c-42de-bd19-277f210823f2',
  'n7zf5LsV9k9vm4U3Exvt',
  'pit-81936628-1094-4ce0-93f6-792503500f56',
  true,
  true,
  true
);
```

## Notas de Segurança
- A API Key será armazenada no campo `ghl_api_key_encrypted`
- O acesso à configuração é restrito por políticas RLS (apenas Super Admins podem modificar)
- O cliente não terá visibilidade desta operação no backend
