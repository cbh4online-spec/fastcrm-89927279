

# Plano: Unificacao do Sistema de IA Conversacional

## Problema Identificado

O sistema atual tem **4 modulos separados** que gerem conceitos sobrepostos:

```text
SITUACAO ATUAL (Fragmentada)
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  [Pagina: Perfis de IA]     [Modulo: Bases Conhecimento]           │
│  └── AIProfilesModule       ├── Personas (tab)                     │
│      └── ai_personas        │   └── ai_personas (mesma tabela!)    │
│                             ├── Agentes (tab)                      │
│                             │   └── ai_agents                      │
│                             └── Widget (tab)                       │
│                                                                     │
│  [Pagina: Motor Conversacional]                                    │
│  ├── Vibe Profiles (tab)                                           │
│  ├── Regras de Conversa (tab)                                      │
│  ├── Objetivos (tab)                                               │
│  └── Auto-Pilot (tab)                                              │
│      └── autopilot_config                                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

PROBLEMAS:
1. "Perfis de IA" e "Personas" usam a MESMA tabela (ai_personas)
2. "Agentes" referenciam Personas, mas estao num modulo diferente
3. AutoPilot esta isolado no Motor Conversacional
4. Utilizador precisa navegar 3+ paginas para configurar um bot
```

---

## Proposta: Modulo Unificado "Assistentes IA"

```text
ARQUITETURA PROPOSTA (Unificada)
┌─────────────────────────────────────────────────────────────────────┐
│  [Nova Pagina: Assistentes IA]                                     │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ AGENTES (entidade central)                                  │   │
│  │ ├── Nome: "Bot WhatsApp Vendas"                            │   │
│  │ ├── Canal: WhatsApp                                        │   │
│  │ ├── Persona: Consultor Comercial                           │   │
│  │ ├── Bases Conhecimento: [Vendas, Produtos]                 │   │
│  │ ├── Fluxo: "Funil Pharliss"                                │   │
│  │ └── AutoPilot: (configuracao inline)                       │   │
│  │     ├── Delay: 8-12s                                       │   │
│  │     ├── Horario: 09:00-18:00                               │   │
│  │     └── Max mensagens: 25                                  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  TABS SECUNDARIAS:                                                  │
│  ├── Personas (biblioteca de personalidades reutilizaveis)         │
│  ├── Bases Conhecimento (acesso rapido)                            │
│  └── Configuracao Global (defaults para todos os agentes)          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Mudancas Propostas

### 1. Expandir Tabela `ai_agents` (Entidade Central)

Adicionar campos do AutoPilot diretamente aos agentes:

| Campo Novo | Tipo | Descricao |
|------------|------|-----------|
| `autopilot_enabled` | boolean | AutoPilot ativo para este agente |
| `response_delay_min` | integer | Delay minimo (segundos) |
| `response_delay_max` | integer | Delay maximo (segundos) |
| `max_messages_per_conversation` | integer | Limite de mensagens |
| `respect_working_hours` | boolean | Respeitar horario |
| `working_hours_start` | time | Inicio do expediente |
| `working_hours_end` | time | Fim do expediente |
| `working_days` | integer[] | Dias de trabalho |
| `out_of_hours_message` | text | Mensagem fora de horas |

### 2. Reorganizar Interface

**Remover/Deprecar:**
- Pagina "Perfis de IA" (`/dashboard/ai-profiles`) - redundante
- Tab "Personas" do KnowledgeBaseModule - mover para novo modulo
- Tab "Agentes" do KnowledgeBaseModule - mover para novo modulo
- Tab "Auto-Pilot" do Motor Conversacional - integrar nos agentes

**Criar:**
- Nova pagina `/dashboard/ai-assistants` - modulo unificado

### 3. Nova Estrutura de Tabs

```text
[Assistentes IA]
├── Agentes          → Lista de bots por canal (WhatsApp, IG, Widget, etc.)
├── Personas         → Biblioteca de personalidades (tom, comportamento)
├── Bases            → Acesso rapido as bases de conhecimento
└── Definicoes       → Configuracoes globais (fallback, defaults)
```

---

## Fluxo de Configuracao Simplificado

```text
ANTES (5+ cliques, 3 paginas):
1. Criar Persona em Bases → Personas
2. Criar Agente em Bases → Agentes
3. Configurar AutoPilot em Motor Conversacional
4. Associar Base de Conhecimento
5. Testar

DEPOIS (2-3 cliques, 1 pagina):
1. Criar Agente (seleciona canal, persona, KBs, configura autopilot inline)
2. Ativar
3. Testar
```

---

## Implementacao Tecnica

### Fase 1: Migracao de Dados

```sql
-- Adicionar campos de autopilot aos agentes
ALTER TABLE ai_agents ADD COLUMN autopilot_enabled BOOLEAN DEFAULT false;
ALTER TABLE ai_agents ADD COLUMN response_delay_min INTEGER DEFAULT 8;
ALTER TABLE ai_agents ADD COLUMN response_delay_max INTEGER DEFAULT 12;
ALTER TABLE ai_agents ADD COLUMN max_messages_per_conversation INTEGER DEFAULT 25;
ALTER TABLE ai_agents ADD COLUMN max_consecutive_bot_messages INTEGER DEFAULT 3;
ALTER TABLE ai_agents ADD COLUMN respect_working_hours BOOLEAN DEFAULT false;
ALTER TABLE ai_agents ADD COLUMN working_hours_start TIME DEFAULT '09:00';
ALTER TABLE ai_agents ADD COLUMN working_hours_end TIME DEFAULT '18:00';
ALTER TABLE ai_agents ADD COLUMN working_days INTEGER[] DEFAULT '{1,2,3,4,5}';
ALTER TABLE ai_agents ADD COLUMN timezone TEXT DEFAULT 'Europe/Lisbon';
ALTER TABLE ai_agents ADD COLUMN out_of_hours_message TEXT;
ALTER TABLE ai_agents ADD COLUMN typing_indicator BOOLEAN DEFAULT true;
ALTER TABLE ai_agents ADD COLUMN sleep_on_human_reply BOOLEAN DEFAULT true;
```

### Fase 2: Novos Componentes

| Ficheiro | Descricao |
|----------|-----------|
| `src/pages/AIAssistants.tsx` | Nova pagina unificada |
| `src/components/ai-assistants/AIAssistantsModule.tsx` | Modulo principal |
| `src/components/ai-assistants/AgentConfigPanel.tsx` | Painel de configuracao completo |
| `src/components/ai-assistants/PersonaLibrary.tsx` | Biblioteca de personas |
| `src/components/ai-assistants/AutopilotSettings.tsx` | Configuracoes inline |

### Fase 3: Atualizacao de Rotas

```typescript
// Antes
/dashboard/ai-profiles     → Remover
/dashboard/knowledge-base  → Manter (sem tabs Personas/Agentes)
/dashboard/conversational-engine → Manter (sem tab Auto-Pilot)

// Depois
/dashboard/ai-assistants   → Nova pagina central
```

### Fase 4: Atualizacao de Edge Functions

As funcoes `chat-widget` e `ai-inbox-reply` passam a:
1. Buscar agente por canal
2. Ler configuracoes de autopilot diretamente do agente
3. Carregar persona e KBs associados

---

## Beneficios

| Antes | Depois |
|-------|--------|
| 3 paginas para configurar bot | 1 pagina unificada |
| Personas duplicadas em 2 locais | Biblioteca centralizada |
| AutoPilot global (igual para todos) | AutoPilot por agente/canal |
| Confusao entre Perfis/Personas/Agentes | Hierarquia clara: Agente > Persona |

---

## Ficheiros a Criar

- `src/pages/AIAssistants.tsx`
- `src/components/ai-assistants/AIAssistantsModule.tsx`
- `src/components/ai-assistants/AgentFullForm.tsx`
- `src/components/ai-assistants/AgentDetailPanel.tsx`
- `src/components/ai-assistants/PersonaLibrary.tsx`
- `src/components/ai-assistants/AutopilotInlineSettings.tsx`
- `src/hooks/useAIAssistants.ts`

## Ficheiros a Modificar

- `src/components/layout/Sidebar.tsx` - Adicionar link "Assistentes IA"
- `src/App.tsx` - Adicionar rota `/dashboard/ai-assistants`
- `src/components/knowledge-base/KnowledgeBaseModule.tsx` - Remover tabs Personas/Agentes
- `src/components/conversational-engine/ConversationalEngineModule.tsx` - Remover tab Auto-Pilot
- `supabase/functions/chat-widget/index.ts` - Usar configuracao de agente
- `supabase/functions/ai-inbox-reply/index.ts` - Usar configuracao de agente

---

## Estimativa

- Migracao SQL: ~30 linhas
- Novos componentes React: ~800 linhas
- Refactoring de modulos existentes: ~200 linhas
- Atualizacao edge functions: ~100 linhas
- **Total: ~1130 linhas de codigo**

---

## Resultado Final

O utilizador tera:
1. **Uma unica pagina** para gerir todos os bots/assistentes
2. **Configuracao completa por canal** (cada WhatsApp pode ter autopilot diferente do Instagram)
3. **Biblioteca de Personas** reutilizaveis entre agentes
4. **Zero duplicacao** de conceitos na interface
5. **Fluxo intuitivo**: Criar Agente → Escolher Canal → Definir Persona → Configurar AutoPilot → Ativar

