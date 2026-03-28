

# Controlo do Bot e Integração com Signals

## Problema Atual
1. **Configuração do bot dispersa** — O autopilot está configurado em 3 locais separados: WhatsApp Config (Definições), Agentes IA (formulário do agente), e toggle global no Inbox. Não há acesso direto a partir dos Grupos.
2. **Mensagens do bot não geram signals** — As mensagens do Bot AIDA nos grupos Telegram não alimentam a tabela `conversation_signals`, tornando impossível ver temperatura, intenção de compra ou próxima ação.
3. **Log de atividade escondido** — O `AutopilotMonitorPanel` existe nas Definições → Integrações, mas não é filtrável por grupo/conversa específica.

---

## Plano de Implementação

### 1. Atalho de Configuração do Bot no GroupChat
**Ficheiro: `src/components/groups/GroupChat.tsx`**

- Adicionar ícone de Bot no header do grupo (junto ao nome "Suporte")
- Ao clicar, abre painel lateral com as configurações do agente associado ao grupo
- Mostra: persona ativa, knowledge base, estado on/off, delay de resposta
- Botão rápido para ligar/desligar autopilot naquele grupo específico

### 2. Painel de Controlo do Bot por Grupo (`BotControlPanel.tsx`)
**Ficheiro novo: `src/components/groups/BotControlPanel.tsx`**

- Reutiliza lógica do `AgentFullForm` mas simplificada para contexto de grupo
- Campos: Persona, Knowledge Base, Auto-Pilot on/off, Delay, Horários
- Toggle de "Pausar com resposta humana"
- Preview da persona ativa com tom de voz

### 3. Mensagens do Bot → Conversation Signals
**Ficheiro: `src/hooks/useConversationSignals.ts` + novo componente**

- Quando o bot responde num grupo, a conversa é ligada à tabela `conversation_signals`
- Usar o `group_id` como chave para buscar/criar signals
- Mostrar no `GroupChat` um painel lateral com: temperatura, probabilidade de fecho, objeção principal, próxima ação, resposta recomendada

### 4. Painel de Signals no GroupChat
**Ficheiro novo: `src/components/groups/GroupSignalsPanel.tsx`**

- Reutiliza o `AIDealInsightPanel` adaptado para contexto de grupo
- Mostra signals atuais + botão "Recalcular" (chama `compute-conversation-signals`)
- Visível no Sheet lateral do grupo (junto aos membros)

### 5. Log de Atividade por Grupo
**Ficheiro: `src/components/groups/GroupChat.tsx` + `AutopilotMonitorPanel.tsx`**

- Adicionar tab "Atividade IA" no sheet de detalhes do grupo
- Filtrar `autopilot_events` pelo `conversation_id` do grupo
- Mostrar: acionamentos, respostas enviadas, erros, pausas

---

## Ficheiros a Criar/Modificar

| Ficheiro | Ação |
|---|---|
| `src/components/groups/BotControlPanel.tsx` | **Novo** — Config simplificada do bot por grupo |
| `src/components/groups/GroupSignalsPanel.tsx` | **Novo** — Painel de signals adaptado para grupos |
| `src/components/groups/GroupChat.tsx` | **Modificar** — Adicionar ícone bot no header + tabs no sheet lateral |
| `src/components/settings/sections/AutopilotMonitorPanel.tsx` | **Modificar** — Aceitar prop opcional `conversationId` para filtrar |
| `src/hooks/useConversationSignals.ts` | **Modificar** — Suportar `groupId` como fonte de signals |

## Onde Fica Cada Coisa

```text
Grupo (GroupChat)
├── Header: [← Suporte] [Telegram · 4 membros] [🤖 Bot Config] [⚡ Signals]
├── Chat messages (já existe)
└── Sheet lateral (já existe para membros)
    ├── Tab Membros (já existe)
    ├── Tab Bot Config (NOVO) → BotControlPanel
    ├── Tab Signals (NOVO) → GroupSignalsPanel  
    └── Tab Atividade IA (NOVO) → AutopilotMonitorPanel filtrado
```

## Resumo do Fluxo
1. **Configurar**: Abrir grupo → clicar 🤖 → configurar persona, knowledge base, autopilot
2. **Monitorar**: Ver signals em tempo real no painel lateral → temperatura, objeções, próxima ação
3. **Auditar**: Tab "Atividade IA" mostra tudo que o bot fez naquele grupo

