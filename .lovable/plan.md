

# P2-1: UI de Progresso de Objetivos

## Contexto

A tabela `conversation_objective_progress` ja existe com colunas: `objective_id`, `conversation_id`, `lead_id`, `status` (pending/collected/failed), `collected_value`, `collected_at`, `crm_updated`, `crm_update_error`, `attempts`. Mas nao ha nenhuma UI que mostre estes dados.

## O que sera implementado

### 1. Hook `useObjectiveProgress`

Novo hook em `src/hooks/useObjectiveProgress.ts` que:
- Busca dados agregados de `conversation_objective_progress` por workspace
- Calcula metricas por objetivo: total tentativas, coletados com sucesso, falhados, taxa de sucesso, ultimo valor coletado
- Recebe `objectiveIds` como parametro para filtrar

### 2. Barra de progresso inline em cada objetivo

Na `ConversationObjectivesTab.tsx`, cada card de objetivo passara a mostrar:
- Mini progress bar com taxa de sucesso (collected / total)
- Texto "X/Y recolhidos" ao lado
- Indicador de CRM sync (quantos atualizaram CRM com sucesso)
- Tudo compacto, abaixo do nome/descricao do objetivo

### 3. Painel de detalhe expandivel

Ao clicar no progresso, expande (via Collapsible) mostrando:
- Ultimos 5 valores recolhidos (collected_value + data)
- Falhas recentes (com crm_update_error se houver)
- Contagem de tentativas medias

## Plano Tecnico

| Ficheiro | Alteracao |
|---|---|
| `src/hooks/useObjectiveProgress.ts` | **Novo** - Hook com query agregada |
| `src/components/conversational-engine/ObjectiveProgressBar.tsx` | **Novo** - Componente visual de progresso |
| `src/components/conversational-engine/ConversationObjectivesTab.tsx` | **Editar** - Integrar progresso em cada card |

### Query de agregacao

```sql
SELECT 
  objective_id,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'collected') as collected,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  COUNT(*) FILTER (WHERE crm_updated = true) as crm_synced,
  MAX(collected_at) as last_collected_at
FROM conversation_objective_progress
WHERE workspace_id = ?
GROUP BY objective_id
```

Sera executada via Supabase client com select + grouping (ou uma view/RPC se necessario).

### Componente ObjectiveProgressBar

- Usa o componente `Progress` existente (`@radix-ui/react-progress`)
- Cor verde se taxa > 70%, amarelo 30-70%, vermelho < 30%
- Texto compacto: "12/15 recolhidos (80%)"
- Badge pequeno para CRM sync status

### Alteracao no ConversationObjectivesTab

- Importa `useObjectiveProgress` e `ObjectiveProgressBar`
- Abaixo de cada objetivo (linha 197-202), adiciona o componente de progresso
- Sem alterar layout existente, apenas acrescenta informacao

## Sem alteracoes de DB

Nao e necessaria nenhuma migracao -- a tabela `conversation_objective_progress` ja existe com todas as colunas necessarias.

