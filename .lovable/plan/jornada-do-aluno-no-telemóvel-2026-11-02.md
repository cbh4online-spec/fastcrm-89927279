# Jornada do Aluno no telemóvel

## Diagnóstico (confirmado na captura e no código)
No telemóvel, o menu lateral da Jornada do Aluno fica sempre aberto e ocupa cerca de 2/3 do ecrã. O painel fica espremido à direita, com títulos e números cortados («Aluno Ativos», «Elegív…», «22…»). O menu não tem versão para ecrãs pequenos.

## O que muda
- **Telemóvel (menos de 768 px):** o menu lateral fica escondido. No topo aparece uma barra com o botão de menu, o nome «Student Journey» e o atalho «SJ Copilot». O botão abre o menu como painel deslizante, que fecha ao escolher uma página.
- **Tablet e computador:** fica tudo igual.
- O conteúdo passa a ocupar a largura toda, com margens menores no telemóvel. Os cartões de números ficam em 2 colunas e os textos deixam de ser cortados.

## Detalhes técnicos
- `SJLayout.tsx`: `hidden md:flex` no `SJSidebar`, barra superior `md:hidden` com `Sheet` (side left) que reutiliza `SJSidebar`, e `main` com `min-w-0 p-4 md:p-6`.
- `SJSidebar.tsx`: nova prop opcional `onNavigate` para fechar o painel deslizante ao clicar; a largura fixa só se aplica a partir de `md`.
- Rever a grelha de KPIs do painel (`grid-cols-2 lg:grid-cols-4`, `min-w-0`, texto com quebra de linha).
- Botão de menu com `aria-label`, foco visível e o comportamento de teclado que o Sheet já traz.

## Critérios de aceitação
- Em 390x844, o painel não tem cortes nem deslocamento horizontal, e o menu abre e fecha.
- Em 768 e 1440 px, o aspeto fica igual ao atual.
- Testar com capturas reais nos três tamanhos.
