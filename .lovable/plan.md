
# Fases do SDR — Pipeline Completo

## Diagnóstico

O SDR actual tem fases hardcoded no código (`enrolled → enriching → sequenced → replied → meeting_set → converted`). O `SDRPipelineView` é uma barra horizontal estática, sem interactividade, personalização ou funil de conversão.

## Solução em 4 blocos

### 1. Tabela `sdr_pipeline_stages` — Fases customizáveis por campanha

Nova tabela para armazenar fases configuráveis:

```text
sdr_pipeline_stages
├── workspace_id (FK)
├── campaign_id (FK nullable — null = template global do workspace)
├── key (text) — identificador interno (ex: "enrolled", "enriching")
├── label (text) — nome visível (ex: "Prospectados")
├── position (int) — ordem no pipeline
├── color (text) — cor hex/tailwind
├── icon (text) — nome do ícone lucide
├── is_terminal (bool) — se é estado final (converted, opted_out)
├── is_negative (bool) — se é estado negativo (opted_out, failed)
└── RLS: workspace members CRUD
```

Seed automático com as 6+2 fases actuais via trigger `on_campaign_create`.

### 2. Hook `useSDRPipelineStages` + CRUD

- Carregar fases por campanha (ou fallback global do workspace)
- Criar/editar/reordenar fases (drag & drop)
- Garantir que `enrolled` e `converted` existem sempre

### 3. Pipeline Kanban Visual

Substituir o `SDRPipelineView` actual por uma versão melhorada:
- **Kanban mode**: colunas drag-and-drop com prospects cards
- **Funnel mode**: gráfico de funil com drop-off % entre fases
- Toggle entre os dois modos
- Clicar numa fase filtra a tabela de enrollments abaixo

### 4. Funil de Conversão

Novo componente `SDRConversionFunnel`:
- Gráfico de funil (usando Nivo/Recharts) com drop-off entre cada fase
- KPIs por fase: taxa de passagem, tempo médio, volume
- Comparação entre campanhas (dropdown)

### 5. Melhorias gerais

- Labels em PT na pipeline view (já parcialmente feito)
- Opt-out e Failed como fases terminais visíveis
- Percentagem de conversão fase-a-fase no pipeline bar

## Ficheiros

| Ficheiro | Acção |
|---|---|
| Migração SQL | Criar tabela `sdr_pipeline_stages` + seed trigger |
| `src/hooks/useSDRPipelineStages.ts` | Novo — CRUD de fases |
| `src/components/sdr/SDRPipelineView.tsx` | Refactor — usar fases dinâmicas + funnel toggle |
| `src/components/sdr/SDRConversionFunnel.tsx` | Novo — gráfico de funil |
| `src/components/sdr/SDRStageSettings.tsx` | Novo — UI de personalização de fases |
| `src/pages/SDRDashboardPage.tsx` | Modificar — integrar novos componentes |

## Segurança

- RLS: workspace members CRUD, escopado por workspace_id
- Seed de fases via trigger SECURITY DEFINER
