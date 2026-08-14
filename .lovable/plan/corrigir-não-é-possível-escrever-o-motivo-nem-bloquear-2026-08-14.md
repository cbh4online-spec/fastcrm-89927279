# Corrigir: não é possível escrever o motivo nem bloquear

## Diagnóstico

Os diálogos "Bloquear" e "Arquivar" são renderizados **dentro** do menu (…) (`DropdownMenuContent`), em `EntityArchiveBlockActions`. O menu do Radix mantém o seu próprio bloqueio de foco e de eventos de ponteiro enquanto está aberto, por isso:

- a caixa de texto do motivo não recebe foco nem aceita escrita;
- como o motivo fica vazio, o botão "Bloquear" permanece desativado (exige 3+ caracteres);
- o mesmo problema afeta o campo de motivo do diálogo de arquivo.

## Correção

Separar os diálogos do menu, mantendo a mesma UX:

1. `EntityArchiveBlockActions` passa a expor apenas os itens de menu, chamando callbacks (`onRequestBlock`, `onRequestArchive`) em vez de renderizar os diálogos.
2. Os diálogos (`BlockEntityDialog`, `ArchiveEntityDialog`) passam a ser renderizados ao nível da linha/página, fora do `DropdownMenu`, controlados por estado local (`{ action, id }`).
3. Aplicar em `CompaniesListIX.tsx`, `ContactsListIX.tsx` e `LeadsListIX.tsx` (um único diálogo partilhado por listagem, com o id do registo selecionado).
4. Em `BlockEntityDialog`/`ArchiveEntityDialog`: fechar corretamente o menu antes de abrir, dar foco automático à caixa de motivo ao abrir e limpar o estado ao fechar.

## Critérios de aceitação

- Ao escolher "Bloquear interações" numa linha, o menu fecha e o diálogo abre com foco no campo Motivo.
- É possível escrever; o botão "Bloquear" ativa a partir de 3 caracteres e o registo fica bloqueado (badge visível).
- O mesmo funciona para "Arquivar" (motivo opcional) nas três listagens.
- Desbloquear/desarquivar continuam a funcionar diretamente no menu.
