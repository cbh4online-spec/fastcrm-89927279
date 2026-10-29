# Alertas de ciclo de compra no ecrã Alertas

## Objetivo
Para além da lista de Empresas, mostrar no ecrã **Alertas** cada cliente que saiu do seu perfil de compra, com acesso direto à ficha.

## O que o utilizador vai ver
- Novo separador **«Ciclo de compra»** ao lado de «Negócios sem atividade», com contador.
- Um alerta por empresa, por exemplo:
  - **Trico Spa — fora do ciclo** (Crítico): «Compra a cada ~28 dias (média 450 €). Está há 41 dias sem comprar.»
  - **Clínica X — janela de recompra** (Aviso): «Atingiu o ciclo habitual de 30 dias. Bom momento para contactar.»
  - **Empresa Y — queda no valor** (Aviso): «Última compra 120 € contra média de 450 €.»
- Gravidade: Crítico quando o atraso passa o dobro do ciclo; Aviso nos restantes casos.
- Clicar abre a ficha da empresa; a seta leva à lista de Empresas já filtrada por «Fora do ciclo».
- Contam para o selo «X críticos» e para a pesquisa do ecrã.
- Limite de 50 alertas, ordenados pelo maior atraso.

## Regras (iguais às da lista de Empresas)
- Ciclo médio calculado pelo histórico de faturas (mínimo 2 compras).
- Fora do ciclo: dias sem comprar acima do ciclo + 30%.
- Janela de recompra: atingiu o ciclo médio.
- Queda no valor: última compra abaixo de 50% do ticket médio.
- Empresas arquivadas ficam de fora.

## Fora deste passo (posso fazer a seguir)
- Aviso no sino e email diário para o gestor da empresa (precisa de tarefa agendada).

## Detalhes técnicos
- `useProductivityHub.ts`: nova fonte que chama `get_companies_financials`, aplica `computePurchaseCadence`, junta nomes de `companies` (sem `archived_at`), categoria nova `purchase`, `actionUrl` para `/dashboard/companies/:id`.
- `AlertsPage.tsx`: entrada `purchase` no mapa de categorias (ícone `ShoppingCart`, tokens `text-warning`), separador e contagem.
- Lista de Empresas lê `?quick=cycle_late` do endereço para o atalho.
- Teste vitest para o mapeamento de gravidade.
