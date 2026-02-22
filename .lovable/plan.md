

# Fix: Rota incorreta no cartao "Reunioes Hoje"

## Problema

O cartao "Reunioes Hoje" navega para `/dashboard/calendar`, mas essa rota nao existe. A rota correta e `/dashboard/scheduling`.

## Solucao

No ficheiro `src/components/productivity/ProductivityDashboard.tsx`, alterar:

- **De:** `navigate('/dashboard/calendar')`
- **Para:** `navigate('/dashboard/scheduling')`

Uma alteracao de uma unica linha.

