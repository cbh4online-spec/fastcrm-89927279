

# Desafios de Vendas — Evolução Completa

## Problema Atual

O módulo é básico: formulário de criação com 6 campos, cards simples sem ações, detalhe limitado a lista de participantes, sem edição/eliminação, sem métricas, sem gestão de participantes, sem recompensas configuráveis.

## Plano

### 1. Hook — CRUD Completo e Gestão de Estado

Adicionar ao `usePerformanceChallenges.ts`:
- **`useUpdateChallenge`** — editar nome, datas, meta, recompensa, status
- **`useDeleteChallenge`** — eliminar (com proteção se tem participantes)
- **`useUpdateChallengeStatus`** — ativar, pausar, encerrar desafio
- **`useLeaveChallenge`** — remover participante

### 2. Dialog de Criação/Edição Rico

Reescrever o dialog com:
- **Tipo com ícones visuais** (grid de cards: Revenue Sprint, Meeting Sprint, Pipeline Builder, Deal Closer)
- **Métrica alinhada ao tipo** (auto-seleciona: revenue → €, meetings → count, pipeline → €, deals → count)
- **Âmbito** — Empresa inteira, Equipa específica, ou Individual
- **Recompensa** — Tipo (reconhecimento, prémio, bónus) + valor descritivo
- **Meta com preview** — "Cada participante precisa atingir X" ou "A equipa precisa atingir X no total"
- **Convidar participantes** — multi-select de membros do workspace
- Modo criar e modo editar (reutilizar dialog)

### 3. Página Redesenhada

**Header com KPIs**: Total desafios ativos, Participantes totais, Maior meta em curso, Taxa de conclusão

**Tabs**: Ativos | Concluídos | Todos

**Cards melhorados** (para cada desafio):
- Ícone do tipo + badge de estado colorido (verde=ativo, amarelo=pausado, cinza=concluído)
- Barra de progresso temporal (dias passados / total)
- Progresso face à meta (agregado dos participantes)
- Contagem de participantes com avatars empilhados
- Recompensa como badge
- Ações hover: editar, pausar/retomar, encerrar, eliminar

**Sheet de detalhe lateral** ao clicar num desafio:
- Header com info completa + estado + ações
- **Leaderboard em tempo real** com ranking, avatar, nome, valor atual, % da meta, pontos
- Barra de progresso individual por participante
- Botão "Participar" / "Sair" para o utilizador atual
- Secção de recompensa destacada
- Timeline: início, fim, dias restantes

### 4. Participação

- Botão "Participar" verifica se o user já está inscrito
- Auto-inscrição de todos os membros se scope = "company"
- Leaderboard ordena por `current_value` desc com ranking dinâmico

## Ficheiros

| Ficheiro | Ação |
|---|---|
| `src/hooks/usePerformanceChallenges.ts` | Adicionar mutations update, delete, status, leave |
| `src/pages/performance/PerformanceChallengesPage.tsx` | Reescrever com KPIs, tabs, cards ricos, sheet detalhe |
| `src/components/performance/ChallengeFormDialog.tsx` | **Criar** — dialog rico de criação/edição |
| `src/components/performance/ChallengeDetailSheet.tsx` | **Criar** — sheet lateral com leaderboard e ações |

