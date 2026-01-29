

# Plano: Sincronização de Contactos do GoHighLevel

## Diagnóstico do Problema

Após análise detalhada, identifiquei dois problemas distintos:

### 1. Timeline vazio para alguns leads
O lead "Maria Oliveira" não tem actividades no Timeline porque:
- Não existem conversas/mensagens associadas a este lead
- O lead foi criado via webhook GHL mas não teve interacções posteriores
- O Jorge Cardoso, por contraste, tem 16 mensagens e actividades registadas

### 2. Falta de sincronização proactiva do GHL
Actualmente o sistema só recebe contactos do GHL quando:
- Um webhook é disparado (novo contacto ou mensagem)
- O contacto interage via Instagram/Facebook/SMS/WhatsApp

**Não existe** uma forma de importar todos os contactos existentes no GHL de uma só vez.

---

## Solução Proposta

Criar uma funcionalidade de **Sync Manual de Contactos GHL** que permite:
1. Importar todos os contactos da location GHL configurada
2. Fazer match com leads/contactos existentes (por email/telefone)
3. Criar novos leads para contactos não existentes
4. Sincronizar histórico de conversas (opcional, mais complexo)

---

## Implementação Técnica

### Parte 1: Edge Function `ghl-sync-contacts`

Nova edge function que:
- Busca todos os contactos da API do GHL via paginação
- Para cada contacto:
  - Verifica se já existe no FastCRM (por email ou telefone)
  - Actualiza o `ghl_contact_id` se existir
  - Cria novo lead se não existir
- Regista progresso e erros no `ghl_sync_log`

```text
Endpoint GHL: GET /contacts/?locationId={id}&limit=100&startAfterId={cursor}
```

**Ficheiro**: `supabase/functions/ghl-sync-contacts/index.ts`

### Parte 2: Hook de Sincronização

```text
src/hooks/useGHLContactSync.ts
```

Hook que:
- Chama a edge function com o workspace actual
- Gere estado de loading/progresso
- Mostra feedback de sucesso/erro

### Parte 3: UI de Sincronização

Adicionar botão "Sincronizar Contactos" nas definições GHL:

```text
src/components/settings/sections/WorkspaceGHLSettings.tsx
```

- Botão com ícone de sincronização
- Estado de loading com progresso
- Feedback de quantos contactos importados/actualizados

---

## Ficheiros a Criar/Modificar

| Ficheiro | Acção |
|----------|-------|
| `supabase/functions/ghl-sync-contacts/index.ts` | Criar |
| `src/hooks/useGHLContactSync.ts` | Criar |
| `src/components/settings/sections/WorkspaceGHLSettings.tsx` | Modificar |

---

## Fluxo da Sincronização

```text
┌─────────────────────────────────────────────────────────────┐
│                    Utilizador                               │
│                         │                                   │
│              Clica "Sincronizar Contactos"                  │
│                         ▼                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           Edge Function: ghl-sync-contacts          │   │
│  │                                                     │   │
│  │   1. Buscar config GHL do workspace                 │   │
│  │   2. Chamar API GHL: GET /contacts/?limit=100       │   │
│  │   3. Para cada contacto:                            │   │
│  │      - Verificar se existe (email/phone)            │   │
│  │      - Criar ou actualizar lead                     │   │
│  │   4. Repetir até não haver mais páginas             │   │
│  │   5. Retornar estatísticas                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                         │                                   │
│                         ▼                                   │
│   ┌─────────────────────────────────────────────────┐       │
│   │   Resposta:                                     │       │
│   │   - created: 45                                 │       │
│   │   - updated: 12                                 │       │
│   │   - skipped: 3                                  │       │
│   │   - errors: []                                  │       │
│   └─────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

---

## Limitações e Considerações

1. **Rate Limiting**: A API do GHL tem limites (tipicamente 100 req/min). A edge function implementará delays entre páginas.

2. **Timeout**: Para locations com muitos contactos (1000+), pode ser necessário implementar processamento em background via Trigger.dev.

3. **Histórico de mensagens**: A sincronização inicial importará contactos mas **não o histórico de conversas**. Isso seria uma fase 2 mais complexa.

4. **Dados sincronizados**:
   - Nome (first_name + last_name)
   - Email
   - Telefone
   - Tags
   - Data de criação no GHL

---

## Resultado Esperado

Após a implementação:
- Botão "Sincronizar Contactos" nas configurações GHL
- Importação de todos os contactos do GHL como leads no FastCRM
- Cada lead terá o `ghl_contact_id` preenchido para futuras interacções
- Timeline funcionará para todos os leads assim que houver actividade

