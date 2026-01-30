

# Plano: Sincronizar Histórico de Conversas GHL - Blecksen

## Situação Actual

A configuração GHL para o workspace **Blecksen** está activa e funcional:

| Item | Estado |
|------|--------|
| Configuração GHL | Activa |
| Location ID | `n7zf5LsV9k9vm4U3Exvt` |
| Leads sincronizados | 5 leads com `ghl_contact_id` |
| Conversas existentes | 0 |

## Problema Identificado

A sincronização de conversas requer **SSE streaming** que não funciona via chamadas API directas. A sincronização deve ser iniciada através da interface do CRM.

## Passos para Sincronizar

### Passo 1: Mudar para o Workspace Blecksen
1. No canto superior esquerdo do CRM, clica no selector de workspace
2. Seleciona "**Blecksen**" da lista

### Passo 2: Ir às Definições
1. Navega para **Definições** no menu lateral
2. Seleciona a secção **Integrações** ou **GoHighLevel**

### Passo 3: Sincronizar Conversas
1. Encontra o cartão azul "**Sincronizar Conversas do GHL**"
2. Clica no botão "**Sincronizar Conversas Agora**"
3. Aguarda enquanto o progresso é mostrado em tempo real

O sistema irá:
- Buscar todas as conversas dos últimos 30 dias do GHL
- Criar conversas no CRM apenas para leads que já têm `ghl_contact_id`
- Importar todas as mensagens de cada conversa

## Alternativa: Sincronizar Mais Contactos Primeiro

Como só tens 5 leads mapeados, a sincronização de conversas será limitada. Se quiseres importar mais histórico:

1. Primeiro clica em "**Sincronizar Contactos Agora**" (cartão laranja)
2. Depois clica em "**Sincronizar Conversas Agora**" (cartão azul)

---

## Secção Técnica

### Arquitectura do Sync

```text
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend (React)                             │
│  useGHLConversationSync.ts → fetch() com SSE streaming          │
└────────────────────────┬────────────────────────────────────────┘
                         │ POST /ghl-sync-conversations
                         │ { workspace_id, stream: true }
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              Edge Function: ghl-sync-conversations              │
│  1. Valida JWT do utilizador                                    │
│  2. Busca config GHL do workspace                               │
│  3. Carrega leads com ghl_contact_id                            │
│  4. Chama API GHL: POST /conversations/search                   │
│  5. Para cada conversa:                                         │
│     - Verifica se lead existe localmente                        │
│     - Cria/actualiza conversation                               │
│     - Busca mensagens: GET /conversations/{id}/messages         │
│     - Insere mensagens não duplicadas                           │
│  6. Envia eventos SSE de progresso                              │
└─────────────────────────────────────────────────────────────────┘
```

### Dependência de Leads

O sync de conversas **só importa conversas para contactos que já estão mapeados como leads**. Por isso é importante sincronizar contactos primeiro.

### Edge Function Endpoint

```
POST /functions/v1/ghl-sync-conversations
Authorization: Bearer <user_jwt>
Body: {
  "workspace_id": "6d108e84-389c-42de-bd19-277f210823f2",
  "stream": true,
  "include_messages": true,
  "days_back": 30
}
```

