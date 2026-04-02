

# Editar Métricas, Metas e Sugestões IA via Context OS

## Diagnóstico

A página `PipelineMetricsPage.tsx` permite **criar** e **apagar** métricas, criar metas e alertas, mas:
- **Não permite editar** métricas existentes (nome, tipo, fórmula, filtros, etc.)
- **Não permite editar nem apagar** metas (targets)
- **Não permite editar nem apagar** alertas
- **Não tem sugestões IA** baseadas no Context OS

O hook `usePipelineMetrics.ts` já tem `updateMetric` implementado mas não é usado na UI. Faltam mutations para `updateTarget`, `deleteTarget`, `updateAlert` e `deleteAlert`.

## Plano

### 1. Hook — Adicionar mutations em falta (`usePipelineMetrics.ts`)
- Adicionar `updateTarget` (update na tabela `pipeline_metric_targets`)
- `deleteTarget` (soft delete — `is_active: false`)
- `updateAlert` (update na tabela `pipeline_metric_alerts`)
- `deleteAlert` (soft delete — `is_active: false`)
- Exportar `updateMetric` (já existe mas não é consumido na página)

### 2. Página — Diálogos de edição (`PipelineMetricsPage.tsx`)

**Métricas:**
- Adicionar botão de edição (ícone lápis) nos cards de métricas
- Reutilizar o dialog de criação em modo edição: preencher os campos com os valores atuais, alterar título para "Editar Métrica" e chamar `updateMetric`

**Metas:**
- Adicionar coluna de ações na tabela com botões Editar/Apagar
- Dialog de edição similar ao de criação, pré-preenchido

**Alertas:**
- Adicionar coluna de ações na tabela com botões Editar/Apagar
- Dialog de edição similar ao de criação, pré-preenchido

### 3. Sugestão IA via Context OS

- Adicionar botão "✨ Sugerir com IA" na tab Métricas e na tab Metas
- Criar chamada à edge function `context-ai-assist` com action `suggest_metrics` que:
  - Lê os blocos do Context OS do workspace (ICP, ofertas, metas de negócio)
  - Gera sugestões de métricas e metas relevantes
  - Retorna nome, descrição, tipo, fórmula e valor sugerido
- Mostrar sugestões num painel/dialog com botão "Adicionar" para criar a métrica/meta sugerida

**Nota:** A edge function `context-ai-assist` já existe e suporta actions custom. Adicionaremos o novo action `suggest_metrics_and_targets` que consulta os `context_blocks` do workspace e gera sugestões via Lovable AI.

## Ficheiros alterados

| Ficheiro | Alteração |
|---|---|
| `src/hooks/usePipelineMetrics.ts` | Adicionar `updateTarget`, `deleteTarget`, `updateAlert`, `deleteAlert`; expor `updateMetric` na página |
| `src/pages/performance/PipelineMetricsPage.tsx` | Adicionar edição inline para métricas, metas e alertas; botão "Sugerir com IA" |
| `supabase/functions/context-ai-assist/index.ts` | Adicionar action `suggest_metrics_and_targets` |

## Critérios de aceitação

- Utilizador pode editar todos os campos de uma métrica existente
- Utilizador pode editar/apagar metas e alertas
- Botão "Sugerir com IA" gera sugestões baseadas nos dados do Context OS
- Sugestões podem ser aceites com um clique (criando a métrica/meta)
- Toasts de sucesso/erro em todas as operações
- Funciona em mobile

