

# Verificacao e correcao dos links dos cartoes de Produtividade

## Problema

Os 4 cartoes KPI na pagina de Produtividade tem efeito de hover visual que sugere serem clicaveis, mas nao possuem nenhum link ou acao de clique. Isto cria uma experiencia confusa para o utilizador.

## Solucao

Adicionar navegacao logica a cada cartao:

| Cartao | Acao ao clicar |
|--------|----------------|
| Prioridades Hoje | Mudar para o tab "Coach Diario" (ja visivel por defeito) |
| Reunioes Hoje | Navegar para `/dashboard/calendar` |
| Metas Ativas | Mudar para o tab "Metas" |
| Diarias / Semanais | Mudar para o tab "Metas" |

## Detalhes tecnicos

### Ficheiro: `src/components/productivity/ProductivityDashboard.tsx`

- Envolver o cartao "Reunioes Hoje" com um `Link` do react-router para `/dashboard/calendar`
- Adicionar `onClick` nos cartoes "Metas Ativas" e "Diarias/Semanais" para `setActiveTab('goals')`
- Adicionar `onClick` no cartao "Prioridades Hoje" para `setActiveTab('coach')`
- Adicionar `cursor-pointer` aos cartoes para indicar interatividade
- Manter o cartao de Reunioes com `cursor-pointer` tambem

Nao sao necessarias alteracoes de base de dados nem de outros ficheiros.

