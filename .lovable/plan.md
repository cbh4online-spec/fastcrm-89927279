# Cartões do painel da Jornada do Aluno clicáveis

## Objetivo
Cada cartão (Alunos Ativos, Concluídos Ativos, Elegíveis Progressão, Alumni Estratégico, Inativos, Para Ativar, Prontos p/ Contacto, Em Risco) passa a abrir a lista de alunos já filtrada, para se ver o detalhe.

## O que muda
- Cartões em `JourneyKPIs.tsx` passam a ser links acessíveis (teclado, foco visível, cursor), para `/dashboard/student-journey/profiles?segment=<chave>`.
- `SJProfiles.tsx` lê o parâmetro `segment` (já usa `useSearchParams`) e aplica o filtro com a mesma regra usada para contar o cartão, para o número bater certo.
- Faixa «Filtro ativo: Em Risco (333)» com botão «Limpar filtro».
- Segmento desconhecido: ignorado, mostra todos.
- Estados: carregamento, lista vazia com mensagem própria do segmento.

## Detalhes técnicos
- Regras de cada segmento extraídas para uma função partilhada (`src/lib/studentJourney/segments.ts`) usada pelos cartões e pela lista, com teste por segmento.
- Sem alterações à base de dados.

## Critérios de aceitação
- Clicar em qualquer cartão abre a lista com o mesmo número de alunos que o cartão mostra.
- Funciona no telemóvel e com teclado.
