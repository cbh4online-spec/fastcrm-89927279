# Fechar o espaço vazio entre o conteúdo e o painel "Detalhes"

## Diagnóstico

Nas fichas de Contacto, Empresa e Lead, a coluna central está limitada a `max-w-4xl` dentro de um contentor `flex-1`. Como o painel lateral "Detalhes" é fixo à direita, sobra uma faixa branca larga entre o bloco "Destaques"/conteúdo e o painel, sobretudo em ecrãs grandes (é o vazio visível na captura).

Ficheiros com a limitação:
- `src/components/contacts/eni/ENIContactDetailWithSidebar.tsx:665`
- `src/components/companies/CompanyDetailWithSidebar.tsx:711`
- `src/components/entity/EntityDetailLayout.tsx:114` (layout genérico usado por outras entidades, incl. leads)

## O que vai ser feito

- Substituir `max-w-4xl` por largura fluida (`w-full`) no contentor central das três fichas, mantendo o padding atual.
- Manter legibilidade em ecrãs muito largos com um limite alto e centrado apenas quando o painel lateral não está visível (abaixo de `xl`, onde "Detalhes" fica oculto).
- Ajustar a grelha de "Destaques" para aproveitar a largura extra (até 5–6 cards por linha em ecrãs largos), evitando cards esticados.

## Detalhes técnicos

- Alterações apenas de classes Tailwind nos três ficheiros acima + `EntityHighlightsGrid.tsx` (colunas responsivas: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6`).
- Sem alterações de dados, hooks, permissões ou lógica de negócio.

## Critérios de aceitação

- Sem faixa branca entre o conteúdo e o painel "Detalhes" em 1280px, 1440px e 1920px.
- Em tablet/mobile (painel oculto) o conteúdo mantém-se legível e sem linhas de texto exageradamente longas.
- Separadores, scroll e painel lateral continuam a funcionar como hoje; sem erros de consola.
