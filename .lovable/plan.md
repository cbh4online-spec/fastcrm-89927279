

# Limpeza e Reorganização dos Estágios do Pipeline

## Problema

A base de dados tem estágios duplicados e em excesso em todos os workspaces. O workspace principal (`d9e3d0ae`) tem **17 estágios** quando deveria ter ~7. Exemplos de duplicação:

| Posição | Estágios atuais (duplicados) | Oportunidades |
|---------|------------------------------|---------------|
| 0 | Lead Captado, Lead Recebido | 1, 0 |
| 1 | Contactado, Interesse Mútuo, Qualificação Técnica e Comercial | 0, 0, 0 |
| 2 | Diagnóstico Agendado, Em Conversa, Levantamento de Requisitos | 0, 0, 1 |
| 3 | Proposta, Proposta Apresentada, Proposta Enviada | 0, 2, 0 |
| 4 | Fechado (x2!), Negociação e Contrato | 0, 0, 0 |
| 5 | Ganho - Kickoff Iniciado, Implementação | 4, 0 |
| 6 | Perdido | 0 |

Os outros workspaces (96037791, 3ab6a0f0, etc.) apresentam o mesmo padrão: estágios duplicados com nomes semelhantes.

## Solução

Executar uma migração SQL que, para **cada workspace**:

1. Define um pipeline limpo de **7 estágios** padronizados
2. Move as oportunidades dos estágios duplicados para o estágio correto mantido
3. Remove os estágios duplicados/vazios

### Pipeline Final (por workspace)

```text
Pos 0: Lead               (#3B82F6 azul)
Pos 1: Qualificação        (#8B5CF6 roxo)
Pos 2: Proposta            (#F59E0B âmbar)
Pos 3: Negociação          (#06B6D4 ciano)
Pos 4: Fechado/Ganho       (#22C55E verde)
Pos 5: Implementação       (#10B981 verde-escuro)
Pos 6: Perdido             (#EF4444 vermelho)
```

## Alterações

### Migração SQL (database migration)

Para o workspace principal (`d9e3d0ae-5893-41e9-97f3-7d7ce6a06f0f`) — o que tem oportunidades:

**Passo 1** — Mover oportunidades dos estágios duplicados para os que ficam:
- `Lead Recebido` (0 opps) → manter `Lead Captado` (1 opp) e renomear para "Lead"
- `Contactado`, `Interesse Mútuo` (0 opps) → consolidar em `Qualificação Técnica e Comercial` renomeado para "Qualificação"
- `Diagnóstico Agendado`, `Em Conversa` (0 opps) → consolidar em `Levantamento de Requisitos` (1 opp) renomeado para "Proposta"
- `Proposta`, `Proposta Enviada` (0 opps) → consolidar em `Proposta Apresentada` (2 opps) renomeado para "Negociação"
- `Fechado` (x2, 0 opps) → consolidar em `Negociação e Contrato` renomeado para "Fechado/Ganho"
- `Implementação` (0 opps) → consolidar em `Ganho - Kickoff Iniciado` (4 opps) renomeado para "Implementação"
- `Perdido` mantém

**Passo 2** — Atualizar posições, nomes e cores dos estágios mantidos

**Passo 3** — Apagar os estágios duplicados sem oportunidades

**Passo 4** — Repetir lógica simplificada para os outros workspaces (todos sem oportunidades, portanto basta manter 1 de cada grupo e apagar os restantes)

### Sem alterações de código

Toda a limpeza é feita na base de dados. Os componentes (`OpportunityKanbanColumn`, `OpportunityCard`, `usePipelineStages`) já funcionam corretamente — apenas mostram demasiadas colunas porque existem demasiados estágios.

