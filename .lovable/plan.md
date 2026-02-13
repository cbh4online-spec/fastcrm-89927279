

# FastCRM Inbox 3.0 -- Action Engine

## Resumo

Redesenho completo do modulo Inbox para transformar num motor operacional de conversao com layout 3 colunas, prioridade por score, AI contextual e zero clutter. Implementacao faseada em 4 fases.

---

## Fase 1 -- Base de Dados e Priority Engine

### 1.1 Migracao DB

Novos campos na tabela `conversations`:

```text
conversation_status_simplified TEXT (REQUIRES_RESPONSE | FOLLOW_UP | RESOLVED | ACTIVE_OPPORTUNITY)
conversation_priority_score INTEGER DEFAULT 0
sla_deadline TIMESTAMP
potential_value_estimate NUMERIC DEFAULT 0
```

Indices para performance:

```text
CREATE INDEX idx_conv_priority_score ON conversations(workspace_id, conversation_priority_score DESC);
CREATE INDEX idx_conv_sla_deadline ON conversations(workspace_id, sla_deadline);
CREATE INDEX idx_conv_last_message ON conversations(workspace_id, last_message_at DESC);
CREATE INDEX idx_conv_status_simplified ON conversations(workspace_id, conversation_status_simplified);
```

Tabela de cache de metricas:

```text
CREATE TABLE conversation_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id),
  conversation_id UUID REFERENCES conversations(id),
  avg_response_time_minutes NUMERIC,
  sla_breached BOOLEAN DEFAULT false,
  ai_suggestions_used INTEGER DEFAULT 0,
  conversion_status TEXT,
  revenue NUMERIC DEFAULT 0,
  updated_at TIMESTAMP DEFAULT now()
);
```

### 1.2 Edge Function: calculate-conversation-priority

Nova edge function que calcula score 0-100 baseado em:
- Tempo desde ultima mensagem inbound (peso 25%)
- Proximidade SLA (peso 20%)
- Classificacao AI de intent (peso 20%)
- Valor potencial do lead/oportunidade (peso 15%)
- Lead score (peso 10%)
- Peso do canal: WhatsApp > SMS > Instagram > Email (peso 10%)

Atualiza automaticamente:
- `conversation_priority_score`
- `sla_deadline`
- `conversation_status_simplified` (se SLA excedido, muda para REQUIRES_RESPONSE)

Triggers de execucao:
- Chamada via webhook na insercao de nova mensagem (trigger DB)
- Chamada no cambio de status
- Cron job a cada 15 minutos (novo agendamento pg_cron)

### 1.3 Cron Job de 15 minutos

Agendamento pg_cron para recalcular prioridades em batch para todas as conversas abertas do workspace.

---

## Fase 2 -- Layout 3 Colunas (Redesenho UI)

### 2.1 InboxView.tsx -- Nova Arquitetura

Substituir o layout atual por 3 colunas limpas:

```text
+------------------+---------------------------+------------------+
| LEFT (25%)       | CENTER (50%)              | RIGHT (25%)      |
| ConversationList | ConversationDetail        | ContextPanel     |
|                  |                           | (collapsible)    |
+------------------+---------------------------+------------------+
```

**Remover do header bar:**
- InboxMetricsBar (mover metricas para analytics dedicado)
- InboxFollowupPanel como painel separado
- Toggle de sidebar

**Header simplificado:**
- ComposeButton
- Contagem de conversas abertas (simples)
- AutopilotToggle (compacto)

### 2.2 ConversationList -- Redesenho

**Remover:**
- Smart filters duplicados (unassigned, high_intent, urgent, waiting_reply)
- Tabs de filtro duplicadas
- Badges excessivas (intent, temperature, priority -- tudo redundante)
- Popover de filtros complexos

**Novo design minimalista por item:**
- Avatar
- Nome
- Icone do canal (pequeno, junto ao nome)
- Tempo desde ultima interacao (ex: "2m", "1h", "3d")
- Priority score badge (color-coded: vermelho >75, amarelo 40-75, cinza <40)
- Indicador SLA (ponto vermelho se proximo do limite)
- Valor potencial (se existe, ex: "EUR 2.500")

**Ordenacao fixa:**
1. Priority score DESC
2. SLA risk first
3. Potential value DESC
4. Last activity DESC

**Estados simplificados (tabs no topo):**
- Requer Resposta
- Follow-up
- Ativas
- Resolvidas

### 2.3 ConversationDetail (CENTER) -- Limpeza

**Manter apenas:**
- Header compacto: Nome + Canal + Status simplificado + Pipeline stage + AI score (numero pequeno)
- Thread de mensagens (MessageBubble existente)
- Reply box (AIMessageComposer)
- 3 botoes de acao: AI Suggest | Templates | Schedule Follow-up

**Remover permanentemente da vista central:**
- ConversationClassification (mover para panel direito)
- ConversationStatusBanner (eliminar)
- AIActionSuggestions visivel permanentemente
- InboxSafetyIndicator
- ConversationTemperature (mover para panel direito)
- ConversationAutopilotToggle (mover para header global)
- AI panel lateral interno (w-80, linhas 502-559)
- EnhancedAIReplyPanel visivel permanentemente
- UnifiedActivityLog inline

### 2.4 Right Panel -- Context Panel (Collapsible)

Novo componente `InboxContextPanel.tsx` com 3 tabs:

**Tab 1 -- AI Insights:**
- Probabilidade de conversao (%)
- Sentimento
- Classificacao de intent
- Recomendacao estrategica
- Dados do ConversationIntelligencePanel

**Tab 2 -- Lead Data:**
- Nome, Email, Phone
- Empresa
- Lifetime value
- Total de oportunidades
- Ultima compra
- Tags

**Tab 3 -- Actions:**
- Criar oportunidade
- Mover pipeline
- Atribuir utilizador
- Mudar status
- Adicionar nota

Panel abre manualmente com botao no header. Fechado por defeito.

---

## Fase 3 -- AI Integration Refinement

### 3.1 AI Suggest -- Modal Unico

Substituir multiplos paineis AI por um unico botao "AI Suggest" na area de resposta que abre um modal com:

- 3 tons de resposta: Direto | Consultivo | Comercial
- Cada tom gera uma sugestao
- Utilizador seleciona e insere no composer
- Log de uso na tabela `ai_agent_executions` (ja existente)

### 3.2 Remocao de Paineis AI Redundantes

Eliminar da vista principal:
- `EnhancedAIReplyPanel` (funcionalidade absorvida pelo modal)
- `AIActionSuggestions` visivel permanentemente
- `ConversationClassification` inline (mover para Tab AI Insights)
- `AiSuggestionBadge`
- `AiSafetyRulesBanner`

---

## Fase 4 -- Analytics e Performance

### 4.1 Metricas (tabela conversation_analytics)

Tracking automatico de:
- Tempo medio de resposta
- Conversas com SLA ultrapassado
- Taxa de uso de sugestoes AI
- Taxa de conversao por conversa
- Receita por conversa

### 4.2 Performance

- Cache de prioridades (recalculo em batch, nao individual)
- Indices DB otimizados (ja na Fase 1)
- Lazy loading do Right Panel (so carrega dados quando aberto)

---

## Ficheiros Afetados

### Novos:
- `src/components/inbox/InboxContextPanel.tsx` -- Panel direito com 3 tabs
- `src/components/inbox/AISuggestModal.tsx` -- Modal unico de sugestoes AI
- `src/components/inbox/PriorityScoreBadge.tsx` -- Badge de score visual
- `supabase/functions/calculate-conversation-priority/index.ts` -- Edge function de scoring

### Modificados:
- `src/components/inbox/InboxView.tsx` -- Layout 3 colunas, remocao de elementos
- `src/components/inbox/ConversationList.tsx` -- Redesenho minimalista
- `src/components/inbox/ConversationDetail.tsx` -- Limpeza massiva, 3 botoes
- `src/components/inbox/AIMessageComposer.tsx` -- Integracao do AI Suggest modal
- `src/pages/Inbox.tsx` -- Header simplificado

### Removidos da vista (nao eliminados, reutilizados no panel):
- `ConversationClassification` -- movido para Tab AI
- `ConversationIntelligencePanel` -- movido para Tab AI
- `EnhancedAIReplyPanel` -- substituido por AISuggestModal
- `AIActionSuggestions` -- substituido por AISuggestModal
- `InboxSafetyIndicator` -- removido
- `ConversationStatusBanner` -- removido
- `InboxSidebar` -- removido (categorias simplificadas no ConversationList)
- `InboxMetricsBar` -- removido (metricas no analytics)
- `InboxFollowupPanel` -- movido para Tab Actions

---

## Design Guidelines

- Inspiracao: Linear / Superhuman / Notion
- Zero clutter na vista principal
- Tipografia forte, badges minimas
- Cor reservada apenas para prioridade (vermelho, amarelo, cinza)
- Espacamento generoso
- Sem banners permanentes
- Panel direito so quando pedido

---

## Compatibilidade

- Mantem tabelas `conversations` e `messages` existentes (apenas adiciona campos)
- Mantem hooks existentes (`useConversations`, `useMessages`, `useInboxAI`)
- Mantem integracao GHL e sincronizacao existente
- RLS e isolamento de workspace mantidos
- Sem alteracoes fora do modulo Inbox

