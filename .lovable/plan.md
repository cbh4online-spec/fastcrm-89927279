

## AI Operations Center — Painel Unificado

### Objectivo
Criar uma página `/dashboard/ai-operations` que mostra o estado em tempo real dos 5 sistemas de IA num único dashboard executivo.

### Layout

```text
┌─────────────────────────────────────────────────────┐
│  AI Operations Center                    [Refresh]  │
├─────────┬─────────┬─────────┬─────────┬─────────────┤
│ Agents  │  IMO AI │ Voice   │ Claude  │ Trigger.dev │
│ ●Active │ ●Active │ ●Active │ ●Active │ ●Active     │
│ 12 runs │ Score85 │ 34 TTS  │ 2.4K tk │ 8/12 OK     │
├─────────┴─────────┴─────────┴─────────┴─────────────┤
│                                                     │
│  [Tab: Overview | Agents | IMO | Voice | Claude |   │
│   Trigger.dev]                                      │
│                                                     │
│  Overview: 5 system cards com status, métricas      │
│  chave, últimas execuções e alertas                 │
│                                                     │
│  Cada tab: dados específicos do sistema             │
└─────────────────────────────────────────────────────┘
```

### Dados por sistema

| Sistema | Fonte de dados | Métricas |
|---------|---------------|----------|
| **AI Agents** | `trigger_job_runs` (type=agent) + `ai_usage_logs` (feature=ai-agent) | Agentes activos, runs 24h, erros, última execução |
| **IMO AI** | `imo_growth_insights` + `imo_market_insights` | Growth score actual, última análise, freshness |
| **ElevenLabs** | `voice_audio_cache` + `voice_settings` | TTS gerados, cache hits, enabled/disabled |
| **Claude/Anthropic** | `ai_usage_logs` (provider=claude) + `ai_settings` | Tokens usados, custo, budget %, modelo activo |
| **Trigger.dev** | `trigger_job_runs` | Jobs 24h (completed/failed/running), próxima execução |

### Implementação

#### 1. Hook `useAIOperationsCenter` (`src/hooks/useAIOperationsCenter.ts`)
- Agrega queries paralelas (react-query) às 5 fontes de dados
- Retorna estado normalizado por sistema: `{ status, metrics, lastActivity, alerts }`
- Status: `operational` | `degraded` | `down` | `unknown` baseado em erros recentes

#### 2. Página `AIOperationsCenterPage` (`src/pages/AIOperationsCenterPage.tsx`)
- 5 KPI cards no topo (um por sistema) com indicador de status (dot verde/amarelo/vermelho)
- Tabs com overview + detalhe por sistema
- Overview: timeline unificada das últimas 20 actividades de todos os sistemas
- Cada tab reutiliza componentes existentes onde possível
- Link rápido para as páginas dedicadas (AI Settings, AI Usage, Background Jobs, IMO AI)

#### 3. Rota em `App.tsx`
- Adicionar `/dashboard/ai-operations` com import lazy

#### 4. Navegação
- Adicionar card de acesso no `AutomationAISettings.tsx`

### Ficheiros
- **Criar**: `src/hooks/useAIOperationsCenter.ts`, `src/pages/AIOperationsCenterPage.tsx`
- **Editar**: `src/App.tsx` (rota), `src/components/settings/sections/AutomationAISettings.tsx` (card)

