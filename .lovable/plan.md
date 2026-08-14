# Fechar o espaço vazio na ficha de Lead (e confirmar Contactos)

## Diagnóstico

- Contactos (`src/components/contacts/eni/ENIContactDetailWithSidebar.tsx:665`) e Empresas já usam largura fluida (`w-full ... xl:max-w-none`), aplicado na alteração anterior.
- A ficha de **Lead** (`src/components/crm/LeadDetailWithSidebar.tsx:470`) mantém `max-w-5xl` fixo sem centragem, o que deixa a faixa branca entre o conteúdo e o painel "Detalhes" (`EntityDetailsPanel`) em ecrãs largos.

## O que vai ser feito

- Alterar o contentor central da ficha de Lead para largura fluida, mantendo o padding atual:
  `w-full p-4 sm:p-8 space-y-6 xl:max-w-none max-w-5xl mx-auto xl:mx-0`.
- Manter a legibilidade abaixo de `xl` (onde o painel lateral está oculto) com o limite atual centrado.
- Sem alterações em Contactos/Empresas — já corrigidos e servem de referência de consistência.

## Detalhes técnicos

- Alteração única de classes Tailwind em `src/components/crm/LeadDetailWithSidebar.tsx` (linha 470).
- Sem alterações de dados, hooks, permissões ou lógica de negócio.

## Critérios de aceitação

- Sem faixa branca entre o conteúdo e o painel "Detalhes" da lead a 1280px, 1440px, 1920px e 2078px.
- Em tablet/mobile o conteúdo mantém-se legível e centrado.
- Separadores, scroll e painel lateral continuam a funcionar; sem erros de consola.
