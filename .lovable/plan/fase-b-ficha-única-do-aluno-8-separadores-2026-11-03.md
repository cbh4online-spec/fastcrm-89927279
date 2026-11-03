# Fase B — Ficha única do aluno (8 separadores)

## O que existe hoje
- A ficha do aluno tem só 3 separadores: Inscrições, Linha temporal e Tarefas.
- Na ficha do contacto, «Percurso do aluno» está escondido dentro de «Mensagens». O botão «Ativar na Jornada» já cria o perfil diretamente.
- A Fase A já guarda os novos dados: estados separados (administrativo, pedagógico, financeiro), presenças, certificados, prestações e faturas ligadas.

## O que muda

**1. Ficha do aluno com 8 separadores** (cabeçalho com nome, estado atual, responsável e atalho para o contacto no CRM):
1. **Perfil**: dados pessoais vindos do contacto (sem duplicar), profissão, origem, consentimentos.
2. **Interesses**: formações de interesse, com prioridade e data. Pode adicionar ou remover.
3. **Inscrições**: uma linha por inscrição (curso, edição, cidade, datas), com os 3 estados em separado. O aviso de inscrição duplicada aparece aqui.
4. **Percurso**: cursos concluídos, em curso e o próximo curso sugerido (Iniciação → Básica → Avançada → Tricologia). É só uma sugestão.
5. **Financeiro**: por inscrição mostra o valor contratado, pago, faturado, vencido e em aberto, mais as prestações. Os valores vêm da regra única da Fase A. Este separador só aparece a quem tem permissão financeira.
6. **Comunicações**: contactos registados com o aluno e mensagens de WhatsApp assistidas. Nada é enviado de forma automática.
7. **Certificação**: presenças por inscrição e certificados emitidos. Um curso só se pode concluir com presença registada.
8. **Progressão**: estado da jornada, pontuação de ativação, dias sem atividade e próxima ação recomendada.

Há também uma **linha temporal** sempre visível ao lado (por baixo no telemóvel), com inscrições, pagamentos, presenças, certificados e contactos por ordem de data, em hora de Lisboa.

- O separador aberto fica no endereço (`?tab=`), para que os links atuais (`?tab=enrollments`) continuem a funcionar.
- No telemóvel os separadores deslizam na horizontal, sem cortar texto.
- Cada separador tem os seus estados de carregamento, vazio e erro.

**2. Ficha do contacto**
- «Jornada do Aluno» passa a ser um separador próprio, com ícone de chapéu de formatura. Só aparece quando o módulo está ativo ou o contacto já tem perfil.
- O cabeçalho mostra uma etiqueta com o estado do aluno (por exemplo «Aluno ativo»). Ao clicar, abre a ficha do aluno.
- Se o contacto ainda não for aluno, mantém-se o botão «Ativar na Jornada».

## Fora desta fase
- Editar edições e calendário (Fase C).
- Registar pagamentos e prestações (Fase D). Nesta fase, o separador Financeiro só mostra os valores, sem os alterar.
- Pipeline comercial (Fase E).

## Critérios de aceitação
- Abrir um aluno mostra os 8 separadores e a linha temporal, sem erros na consola.
- Um utilizador sem permissão financeira não vê o separador Financeiro, e o servidor também não lhe devolve esses dados.
- Os valores do Financeiro batem certo com a regra única (o faturado não conta faturas anuladas nem a mesma fatura duas vezes).
- Na ficha do contacto aparecem o separador «Jornada do Aluno» e a etiqueta de estado.
- No telemóvel (393px), nada fica cortado.

## Detalhes técnicos
- `SJProfileDetail.tsx` passa a ser um contentor fino, com `useSearchParams` para a `tab`. Cria-se um componente por separador em `src/components/student-journey/profile/` (`ProfileTab`, `InterestsTab`, `EnrollmentsTab`, `PathTab`, `FinanceTab`, `CommunicationsTab`, `CertificationTab`, `ProgressionTab`) e o `StudentTimeline`.
- Hooks por separador com React Query, com o workspace incluído na chave: `useSjEnrollmentFinance` (lê `sj_installments` + `sj_enrollment_invoices` e usa `computeEnrollmentFinance`), `useSjAttendance`, `useSjCertificates` e `useStudentTimeline` (junta as várias fontes no cliente e ordena com `lisbonDays`).
- O separador Financeiro fica protegido por `sj_has_any_role` (RLS já existente) e pela capability no cliente. Se não houver permissão, o separador fica escondido.
- `EntityHorizontalTabs.tsx`: o grupo `student-journey` sai de `communication` e passa a grupo de topo. O badge no cabeçalho de `ENIContactDetailWithSidebar.tsx` usa `useContactStudentJourneyProfile`.
- Testes: um teste unitário para a ordenação e o agrupamento da linha temporal e outro para a regra de visibilidade do separador Financeiro.
- Sem alterações à base de dados. Se faltar algum campo durante a implementação, faz-se uma migração aditiva mínima.
