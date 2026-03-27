

# Pipeline Mortgage Journey — Crédito Habitação

## Objetivo
Criar o pipeline "Mortgage Journey / Crédito Habitação" com 12 estágios completos, incluindo metadados ricos (critérios de entrada/saída, campos obrigatórios, tarefas padrão, regras de bloqueio) que o sistema atual não suporta.

## Situação atual
- Tabelas `pipelines` e `pipeline_stages` existem com: name, position, probability, color, description, expected_days
- **Não existe** suporte para: entry/exit criteria, required_fields, default_tasks, blocked_if, phase, next_stage
- Estes metadados precisam de ser armazenados — a forma mais limpa é adicionar uma coluna JSONB `config` ao `pipeline_stages`

## Plano

### 1. Migração — Adicionar coluna `config` ao `pipeline_stages`

```sql
ALTER TABLE pipeline_stages 
  ADD COLUMN IF NOT EXISTS config jsonb DEFAULT '{}';
```

A coluna `config` guarda por estágio:
```json
{
  "phase": "Preparation",
  "objective": "...",
  "entry_criteria": ["..."],
  "exit_criteria": ["..."],
  "required_fields": ["..."],
  "default_tasks": ["..."],
  "blocked_if": ["..."],
  "next_stage_code": "research_budget"
}
```

### 2. Migração — Criar pipeline e 12 estágios

Função `create_mortgage_pipeline_for_workspace(p_workspace_id)` que:
- Cria registo em `pipelines` (name: "Mortgage Journey", type: "sales", code: "mortgage_journey")
- Adicionar coluna `code` à tabela `pipelines` para identificação por código
- Insere 12 estágios com probability, color por fase, expected_days e config JSONB completo
- Cria benchmarks em `pipeline_stage_benchmarks` para cada estágio
- Executa para todos os workspaces existentes + trigger para novos

**Cores por fase:**
- Preparation (3 stages): tons de azul (#3b82f6, #60a5fa, #93c5fd)
- Approval (3 stages): tons de amber (#f59e0b, #fbbf24, #fcd34d)
- Application (3 stages): tons de violet (#8b5cf6, #a78bfa, #c4b5fd)
- Closing (3 stages): tons de verde (#22c55e, #4ade80, #86efac)

### 3. UI — Suporte à visualização de config nos estágios

Atualizar o hook `usePipelineStages` e componentes de pipeline para:
- Expor o campo `config` no tipo `PipelineStage`
- Mostrar fase (phase) como badge no card de estágio
- Mostrar critérios de entrada/saída e tarefas padrão no painel de detalhe do estágio

### Ficheiros alterados

| Ficheiro | Ação |
|----------|------|
| Nova migração SQL | Coluna `config` + coluna `code` + pipeline mortgage + 12 estágios |
| `src/hooks/usePipelineStages.ts` | Adicionar `config` ao tipo PipelineStage |
| `src/components/pipeline/` | Exibir metadados ricos (fase, critérios, tarefas) nos cards |

