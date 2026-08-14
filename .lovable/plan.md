# Botão para voltar no AI Operations Center

## Diagnóstico
A rota `/dashboard/ai-operations` está registada em `src/routes/AIRoutes.tsx` a renderizar `AIOperationsCenterPage` diretamente, e a página não usa `DashboardLayout` (confirmado no ficheiro). Resultado: o ecrã abre sem barra lateral nem topbar, portanto não existe forma de regressar ao menu — exatamente o que se vê na captura.

## O que fazer
1. Envolver a página `AIOperationsCenterPage` em `DashboardLayout`, para recuperar barra lateral, topbar e navegação normal do dashboard.
2. Acrescentar no topo do conteúdo um botão "Voltar" (ícone `ArrowLeft`, `variant="ghost"`, `size="sm"`) que navega para `/dashboard`, seguindo o mesmo padrão já usado noutras páginas do projeto — útil também em mobile, onde a barra lateral está colapsada.

## Notas técnicas
- Alteração apenas de apresentação: nenhuma query, hook (`useAIOperationsCenter`) ou lógica de estado é tocada.
- Manter o padding atual (`p-6`) sem duplicar espaçamento dentro do layout.

## Critérios de aceitação
- `/dashboard/ai-operations` mostra a barra lateral e permite navegar para qualquer outro menu.
- Existe um botão "Voltar" visível no topo, que devolve ao dashboard.
- Comportamento correto em desktop e mobile, sem alterações nos KPIs nem nos separadores.
