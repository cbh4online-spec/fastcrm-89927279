

# Adicionar Canais ao Sistema de Agentes IA

## Problema

O sistema de agentes IA só tem 7 canais (widget, whatsapp, instagram, facebook, email, sms, live_chat). Falta Telegram e outros canais relevantes.

## Solução

Adicionar novos canais ao `AgentChannel` type e configurações associadas:

| Canal | Ícone | Cor |
|-------|-------|-----|
| **Telegram** | `Send` | blue-500 |
| **TikTok** | `Video` | gray-900 |
| **Twitter/X** | `Twitter` | sky-500 |
| **Google Business** | `MapPin` | red-500 |
| **LinkedIn** | `Linkedin` | blue-700 |

## Ficheiros a editar

**1. `src/types/aiChannelAgents.ts`** — Adicionar 5 novos valores ao `AgentChannel` type e entradas no `AGENT_CHANNELS` record

**2. `src/components/ai-agents/AIAgentForm.tsx`** — Adicionar ícones ao `channelIcons` map

**3. `src/components/ai-agents/BotSetupWizard.tsx`** — Já usa `Object.entries(AGENT_CHANNELS)` dinamicamente, funciona automaticamente

**4. `src/components/ai-assistants/AgentCardExpanded.tsx`** — Já usa `AGENT_CHANNELS[agent.channel]`, funciona automaticamente

Impacto mínimo: a maioria dos componentes já itera sobre `AGENT_CHANNELS` dinamicamente. Só o `channelIcons` map no `AIAgentForm.tsx` precisa de entradas manuais.

