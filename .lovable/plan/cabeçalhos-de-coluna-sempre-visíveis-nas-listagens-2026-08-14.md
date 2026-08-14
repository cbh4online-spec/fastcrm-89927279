# Cabeçalhos de coluna sempre visíveis nas listagens

## Diagnóstico

Nas listagens IX de Contactos, Empresas e Leads as linhas são cartões (`div`) com as colunas escolhidas no seletor "Colunas", mas **não existe nenhuma linha de cabeçalho** — por isso não se percebe o que é cada valor (email, telefone, morada, NIF, etc.), como se vê no ecrã de Contactos.

## O que vai ser feito

1. **Linha de cabeçalho** por cima da lista, com os nomes das colunas ativas, alinhada exatamente às colunas dos cartões (mesmas larguras e mesmo espaçamento), mais uma coluna vazia à direita para o menu de ações.
2. **Sempre visível**: o cabeçalho fica fixo (sticky) no topo da área de lista ao fazer scroll, com fundo próprio para não sobrepor conteúdo.
3. **Reage ao seletor de colunas**: ao adicionar/remover colunas, o cabeçalho actualiza-se automaticamente.
4. Aplicado às três listagens: Contactos, Empresas e Leads.

## Detalhes técnicos

- Novo componente partilhado `src/components/common/ListColumnsHeader.tsx`: recebe `orderedColumns`, o mapa de larguras (`COLUMN_WIDTH`) e as definições de coluna (label), e replica o mesmo `flex ... gap-4 px-4` das linhas.
- Integração em `ContactsListIX.tsx`, `CompaniesListIX.tsx` e `LeadsListIX.tsx`, imediatamente antes do `flex flex-col gap-2` das linhas.
- Estilo: `sticky top-0 z-10 bg-background/95 backdrop-blur`, texto `text-xs font-medium uppercase text-muted-foreground`, borda inferior — tokens semânticos, sem cores hardcoded.
- Sem alterações de dados, hooks ou RLS.

## Critérios de aceitação

- Cada coluna tem título legível nas três listagens.
- O cabeçalho mantém-se visível durante o scroll e alinhado com os valores.
- Alterar as colunas no seletor reflete-se no cabeçalho.
