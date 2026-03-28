

# Ações Avançadas para AI Employees

## Problema

O módulo AI Employees tem funcionalidades básicas (criar, configurar persona/KB, ativar/pausar, analytics simples) mas falta profundidade operacional. O card mostra pouca informação, a página de detalhe só tem 2 tabs (Configuração e Analytics), e não há forma de testar, ver logs de conversas, duplicar, ou agendar execuções proativas.

## Melhorias a Implementar

### 1. Tab de Logs de Conversas
- Nova tab **"Conversas"** na página de detalhe do bot
- Lista paginada das execuções (`bot_runs`) com status, data, conversa associada
- Expandir cada entrada para ver input/output payload
- Filtros por status (ok, error, handover) e período

### 2. Test Chat — Testar o Bot em Tempo Real
- Nova tab **"Testar"** com um mini-chat embebido
- Envia mensagens ao `ai-employee-executor` com `dry_run: true`
- Mostra resposta do bot, ações detectadas e debug info
- Permite validar persona, KB e fluxo sem ativar em produção

### 3. Multi-Canal por Bot
- Alterar de campo `channel` (singular) para `channels` (array de strings)
- Migração DB: adicionar coluna `channels text[] default '{}'`
- UI com checkboxes no painel de configuração
- Manter retrocompatibilidade lendo o campo `channel` legacy

### 4. Agendamento de Execuções Proativas
- Nova secção **"Agendamento"** no painel de configuração
- Cron expression com UI amigável (diário, semanal, personalizado)
- Campos: `schedule_enabled`, `schedule_cron`, `next_run_at` na tabela `bots`
- Integra com o Trigger.dev job `ai-employee-scheduler` já existente

### 5. Duplicar Bot
- Botão **"Duplicar"** no dropdown do card e na página de detalhe
- Cria cópia com nome "{nome} (cópia)" em status draft
- Copia settings, KB, persona, prompt, guided_config

### 6. Exportar / Importar Configuração
- **Exportar**: botão que gera JSON com toda a config do bot
- **Importar**: upload de JSON que preenche o wizard de criação
- Permite partilhar configs entre workspaces

### 7. Mensagens de Greeting e Fallback
- Expor os campos `greeting_message` e `fallback_message` (já existem em `bot_settings`)
- Adicionar ao `BotSettingsPanel` na secção Comportamento
- Preview visual de como a mensagem aparece

### 8. Webhooks / Trigger de Automação
- Nova secção no painel: **"Ações Automáticas"**
- Configurar webhook URL para eventos: conversa iniciada, lead criada, handover
- Toggle por tipo de evento
- Ligação com o Flow Builder existente (trigger_automation)

### 9. BotCard com Métricas Live
- Mostrar no card: últimas 24h de conversas, taxa de sucesso
- Indicador "Última atividade: há X min"
- Mini-sparkline ou badge com tendência
- Query leve ao `bot_analytics` na listagem

## Ficheiros

| Ficheiro | Alteração |
|----------|-----------|
| `src/pages/AIEmployeeDetailPage.tsx` | Adicionar tabs Conversas, Testar |
| `src/components/ai-employees/BotSettingsPanel.tsx` | Multi-canal, greeting/fallback, agendamento, webhooks |
| `src/components/ai-employees/BotCard.tsx` | Métricas live, ação duplicar |
| `src/components/ai-employees/BotConversationLogs.tsx` | **Novo** — lista de bot_runs |
| `src/components/ai-employees/BotTestChat.tsx` | **Novo** — chat de teste |
| `src/hooks/useBots.ts` | Mutation duplicar, query métricas card |
| **Migração SQL** | Adicionar `channels`, `schedule_enabled`, `schedule_cron`, `next_run_at` à tabela `bots` |

## Ordem de Implementação

1. Migração DB (novas colunas)
2. BotCard melhorado + duplicar
3. BotSettingsPanel expandido (greeting, fallback, multi-canal, agendamento)
4. Tab Conversas (logs)
5. Tab Testar (chat)
6. Webhooks/automações
7. Export/Import

