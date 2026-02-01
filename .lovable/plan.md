

# Plano: Agentes IA Multi-Plataforma com Bases de Conhecimento Independentes

## Objetivo
Criar um sistema de **Agentes IA** que permita configurar assistentes distintos para cada plataforma/canal (WhatsApp, Instagram, Widget, Email, etc.), cada um com a sua propria persona e bases de conhecimento especificas.

---

## Arquitetura Atual vs. Proposta

### Situacao Atual
```text
[Workspace]
    ├── [Personas IA] ── allowed_channels[], knowledge_base_ids[]
    └── [Widget Config] ── default_persona_id, knowledge_base_ids[]
```
- Uma Persona pode ter multiplos canais, mas nao ha uma forma clara de definir comportamentos diferentes por canal
- O Widget tem a sua propria configuracao, mas WhatsApp/Instagram/Email nao tem

### Arquitetura Proposta
```text
[Workspace]
    ├── [Agentes IA] ──┬── Widget Agent (Persona A, KB 1,2)
    │                  ├── WhatsApp Agent (Persona B, KB 2,3)  
    │                  ├── Instagram Agent (Persona C, KB 1)
    │                  └── Email Agent (Persona D, KB 3,4)
    ├── [Personas IA] ── Tom, comportamento, limitacoes
    └── [Bases Conhecimento] ── FAQs, documentos, artigos
```

---

## Nova Entidade: AI Agents

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `id` | uuid | Identificador unico |
| `workspace_id` | uuid | Workspace associado |
| `name` | text | Nome do agente (ex: "Bot WhatsApp Vendas") |
| `description` | text | Descricao do agente |
| `channel` | text | Canal: widget, whatsapp, instagram, facebook, email, sms |
| `persona_id` | uuid | FK para ai_personas |
| `knowledge_base_ids` | uuid[] | Array de KBs associadas |
| `flow_id` | uuid | Fluxo conversacional padrao (opcional) |
| `is_active` | boolean | Ativo/Inativo |
| `priority` | integer | Prioridade quando ha multiplos agentes no mesmo canal |
| `settings` | jsonb | Configuracoes especificas do canal |
| `created_at` | timestamp | Data de criacao |
| `updated_at` | timestamp | Data de atualizacao |

---

## Interface do Utilizador

### Localizacao
- Nova tab **"Agentes"** no modulo de Bases de Conhecimento e IA
- Tabs: Bases | Personas | **Agentes** | Fluxos | Widget | Testar IA

### Lista de Agentes
- Cards por canal com icone identificativo (WhatsApp verde, Instagram rosa, etc.)
- Badge de estado (Ativo/Inativo)
- Indicacao de Persona e numero de KBs associadas
- Botao "Novo Agente" com selecao de canal

### Formulario de Criacao/Edicao
1. **Selecionar Canal** - dropdown com canais disponiveis
2. **Nome do Agente** - identificacao interna
3. **Selecionar Persona** - escolher entre personas existentes
4. **Bases de Conhecimento** - multi-select de KBs ativas
5. **Fluxo Conversacional** - opcional, para funis estruturados
6. **Configuracoes Especificas** - variam por canal

---

## Fluxo de Utilizacao

```text
1. Utilizador cria Personas (define tom, comportamento)
2. Utilizador cria Bases de Conhecimento (adiciona conteudo)
3. Utilizador cria Agentes:
   - WhatsApp Agent → Persona "Comercial" + KBs "Vendas" e "Produtos"
   - Instagram Agent → Persona "Social" + KBs "FAQ" e "Promocoes"
   - Widget Agent → Persona "Suporte" + KBs "Suporte" e "Tutorial"
4. Cada canal usa o agente configurado automaticamente
```

---

## Implementacao Tecnica

### 1. Nova Tabela no Banco de Dados

```sql
CREATE TABLE ai_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  channel TEXT NOT NULL, -- widget, whatsapp, instagram, facebook, email, sms
  persona_id UUID REFERENCES ai_personas(id) ON DELETE SET NULL,
  knowledge_base_ids UUID[] DEFAULT '{}',
  flow_id UUID REFERENCES conversational_flows(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT unique_workspace_channel_priority 
    UNIQUE (workspace_id, channel, priority)
);

-- Index para busca rapida por workspace e canal
CREATE INDEX idx_ai_agents_workspace_channel 
  ON ai_agents(workspace_id, channel) WHERE is_active = true;
```

### 2. Politicas RLS

```sql
-- Leitura para membros do workspace
CREATE POLICY "Members can view agents" ON ai_agents
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );

-- Gestao para admins e super admins
CREATE POLICY "Admins can manage agents" ON ai_agents
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
    OR public.is_super_admin(auth.uid())
  );
```

### 3. Novos Componentes React

| Componente | Descricao |
|------------|-----------|
| `AIAgentList.tsx` | Lista de agentes com filtro por canal |
| `AIAgentCard.tsx` | Card individual com icone do canal |
| `AIAgentForm.tsx` | Formulario de criacao/edicao |
| `AIAgentSelector.tsx` | Dropdown para selecionar agente |

### 4. Hook de Gestao

```typescript
// src/hooks/useAIAgents.ts
export function useAIAgents() {
  // fetchAgents() - lista todos os agentes
  // fetchAgentByChannel(channel) - busca agente ativo para canal
  // createAgent(data) - cria novo agente
  // updateAgent(id, data) - atualiza agente
  // deleteAgent(id) - remove agente
  // toggleAgentStatus(id) - ativa/desativa
}
```

### 5. Atualizacao das Edge Functions

As funcoes `chat-widget`, `ai-inbox-reply`, e futuras integracoes WhatsApp/Instagram irao:
1. Identificar o canal de origem
2. Buscar o agente ativo para esse canal via `ai_agents`
3. Carregar a persona e KBs associadas
4. Gerar resposta com contexto correto

---

## Canais Suportados

| Canal | Icone | Cor | Integracao |
|-------|-------|-----|------------|
| Widget | MessageCircle | Indigo | Ja implementado |
| WhatsApp | Phone | Verde | GHL + futuro nativo |
| Instagram | Instagram | Rosa/Magenta | GHL + futuro nativo |
| Facebook | Facebook | Azul | GHL |
| Email | Mail | Cinza | SMTP/GHL |
| SMS | MessageSquare | Amarelo | GHL |

---

## Ficheiros a Criar/Modificar

### Novos Ficheiros
- `src/components/ai-agents/AIAgentList.tsx`
- `src/components/ai-agents/AIAgentCard.tsx`
- `src/components/ai-agents/AIAgentForm.tsx`
- `src/components/ai-agents/CreateAgentDialog.tsx`
- `src/hooks/useAIAgents.ts`
- `src/types/aiAgents.ts`

### Ficheiros a Modificar
- `src/components/knowledge-base/KnowledgeBaseModule.tsx` - adicionar tab "Agentes"
- `supabase/functions/chat-widget/index.ts` - buscar agente por canal
- `supabase/functions/ai-inbox-reply/index.ts` - buscar agente por canal

---

## Resultado Final

Apos implementacao, o utilizador podera:
1. Criar agentes especificos para cada canal (WhatsApp, Instagram, Widget, etc.)
2. Associar personas diferentes a cada agente
3. Definir bases de conhecimento especificas por agente
4. Ter respostas contextualizadas para cada plataforma
5. Gerir todos os agentes de forma centralizada

---

## Estimativa

- **Migracao SQL**: ~50 linhas
- **Novos componentes React**: ~400 linhas
- **Hook useAIAgents**: ~150 linhas
- **Tipos TypeScript**: ~50 linhas
- **Atualizacao edge functions**: ~100 linhas
- **Total estimado**: ~750 linhas de codigo

