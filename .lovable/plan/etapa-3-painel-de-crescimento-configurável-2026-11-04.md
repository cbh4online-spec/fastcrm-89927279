# Etapa 3 — Painel de Crescimento configurável

## Objetivo
Cada organização tem um único painel de Crescimento. Os gestores escolhem os indicadores que aparecem, a ordem e o grupo. Os restantes membros só veem o painel, sem o poder alterar.

## O que o utilizador vê
- Botão «Personalizar painel» (só para gestores e super admin).
- Abre-se um painel lateral com a lista de indicadores dos modelos ativos:
  - interruptor para mostrar ou esconder cada indicador;
  - setas para cima e para baixo (funcionam com teclado e no telemóvel) e arrastar para ordenar no computador;
  - «Repor padrão», que volta à ordem dos modelos;
  - «Guardar» e «Cancelar», com aviso de alterações por guardar.
- Os indicadores «Em breve» podem ser ordenados, mas aparecem marcados.
- Sem configuração guardada, o painel mostra o comportamento atual (todos os indicadores dos modelos).
- Se um modelo for desativado, os indicadores dele saem do painel automaticamente. Os indicadores de modelos novos aparecem no fim.
- Estados previstos: a carregar, erro ao guardar (mensagem clara e as alterações não se perdem) e sucesso (aviso no ecrã).

## Decisões
- A configuração é da organização (resposta dada). A leitura é permitida a membros; a escrita só a gestores e super admin, com as mesmas regras que já se aplicam aos modelos.
- Os grupos (Faturação, Comercial, Operação) mantêm-se. A ordem aplica-se dentro de cada grupo, para o painel continuar legível.
- Há um limite de 40 indicadores visíveis.

## Detalhes técnicos
- Migração: novas colunas `indicator_order text[] default '{}'` e `hidden_indicators text[] default '{}'` em `workspace_bgi_settings`. Estende-se o trigger `bgi_settings_validate` para remover ids duplicados e limitar o tamanho (até 100). Os ids desconhecidos ficam filtrados no cliente pelo catálogo. As regras de acesso (RLS) e a auditoria existentes mantêm-se.
- `src/lib/bgi/dashboardLayout.ts`: função pura `applyLayout(indicators, order, hidden)`. Ignora ids que não estão nos modelos e acrescenta os novos no fim. Mais `sanitizeLayout`, com testes.
- `useBgiSettings`: passa a ler e guardar `indicatorOrder` e `hiddenIndicators`, com upsert parcial que não apaga os modelos.
- `BgiKpiGrid`: aplica `applyLayout` antes de agrupar.
- Novo `BgiLayoutEditor.tsx` (Sheet), com o botão protegido por `useCapability` de gestão.
- Regra no `AGENTS.md`: a disposição do painel BGI é por workspace e é resolvida só por `dashboardLayout.ts`.

## Critérios de aceitação
- Um gestor esconde e reordena indicadores, guarda, recarrega a página e vê a mesma ordem. Os outros membros veem essa ordem e não têm o botão.
- Uma escrita direta feita por quem não é gestor é recusada.
- Desativar um modelo não deixa indicadores órfãos nem dá erros.
- Os testes de `dashboardLayout` passam, o build fica OK e o ecrã é verificado no telemóvel.

## Riscos
- Arrastar no telemóvel é pouco fiável, por isso as setas são o método principal.
