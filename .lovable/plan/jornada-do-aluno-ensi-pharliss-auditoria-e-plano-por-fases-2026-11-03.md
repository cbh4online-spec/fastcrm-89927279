# Jornada do Aluno (ENSI / PHARLISS) — Auditoria e plano por fases

## 1. Auditoria do que já existe

Já existe um módulo funcional, com dados reais na PHARLISS:

| Área | Situação atual | Decisão |
|---|---|---|
| Ficha do aluno (`sj_profiles`, 571) | 490 ligados a contactos, 81 sem ligação | Reutilizar; o contacto do CRM passa a ser a identidade única |
| Cursos (`sj_courses`, 8) | Tem nome, horas, preço, pré-requisitos e próximos cursos | Reutilizar; faltam código, categoria, formadores e curso anterior |
| Edições (`sj_cohorts`, 1) | Datas, capacidade e estado em texto livre | Reutilizar; faltam local/cidade, formador, preço, vagas reservadas e os estados pedidos |
| Blocos (`sj_course_phases`, 0) | Já permite vários blocos por edição | Reutilizar; tem de ser a estrutura de "2 blocos de 4 dias" |
| Inscrições (`sj_enrollments`, 445) | Estado e estado de pagamento num só campo | Separar os estados administrativo, pedagógico e financeiro |
| Comunicações e tarefas | `sj_touchpoints` e `sj_tasks` | Reutilizar |
| Automações | `sj_automations` e registos | Reutilizar, desligadas até serem validadas |
| Importação | `sj_import_jobs` existe, mas sem execuções | Montar um assistente com rastreabilidade |
| Permissões | `sj_permissions` + permissões do CRM | Juntar as funções num único sistema |
| Em falta | Presenças, certificados, plano de prestações, ligação a faturas, origem Meta | Criar |

Riscos já detetados: a mesma pessoa pode ter inscrições duplicadas na mesma edição; o estado "concluído" pode ser marcado sem presenças; os contadores do painel misturam estado comercial e estado pedagógico.

## 2. Fases (cada fase só avança depois de aprovada)

**Fase A — Modelo de dados (sem perder nada)**
- Acrescentar os campos em falta a cursos, edições e inscrições (sem apagar nem mudar o tipo de nenhum campo).
- Criar o que falta: presenças por bloco, certificados, prestações por inscrição, ligação inscrição↔fatura e proveniência da importação (ficheiro, folha, linha).
- Uma inscrição por aluno e por edição, salvo duplicado autorizado explicitamente; os blocos nunca criam inscrições novas.
- Acesso limitado ao workspace, com funções Administrador, Gestão, Comercial, Administrativo, Financeiro e Formador; os dados financeiros e administrativos ficam escondidos a quem não tem autorização.
- Registo das alterações importantes.

**Fase B — Ficha única com 8 separadores**
Perfil, Interesses, Inscrições, Percurso, Financeiro, Comunicações, Certificação e Progressão, com uma linha temporal. Na ficha do contacto aparece um separador "Jornada do Aluno" e um botão "Ativar na Jornada" (substitui a ligação "Criar Perfil", que hoje não leva a lado nenhum).

**Fase C — Catálogo, edições, inscrições e calendário**
- Gestão de cursos com o percurso recomendado (Iniciação → Básica → Avançada → Tricologia), que é só uma sugestão.
- Edições com Porto/Lisboa, blocos, vagas e estados (planeada, provisória, confirmada, em curso, concluída, cancelada).
- Vista de inscritos por turma e vista de calendário.

**Fase D — Financeiro**
Valor base, desconto, valor acordado, prestações e vencimentos. Os valores contratado, pago, faturado, vencido e em aberto ficam separados. O faturado só conta faturas válidas do módulo financeiro (sem contar duas vezes). Nunca se emite nenhum documento automaticamente.

**Fase E — Pipeline comercial**
As 11 etapas pedidas, sobre as oportunidades que já existem no CRM, com formação pretendida, origem/campanha, responsável, próxima ação e motivo de perda. É independente do estado pedagógico.

**Fase F — Importação de históricos**
Assistente para Excel/CSV com todas as folhas: mapeamento de colunas, pré-visualização, normalização de nome/email/telefone, duplicados dentro do ficheiro, entre ficheiros e face aos contactos. Os casos duvidosos vão para revisão manual e nunca são fundidos sozinhos. Há comparação prévia dos dois ficheiros de 2027 e um relatório final (criados, atualizados, ignorados, duplicados, erros). Pode repetir-se sem duplicar e começa com amostras. **Depende de recebermos os ficheiros.**

**Fase G — Painel e relatórios com dados reais**
Os indicadores da secção 3A e os relatórios da secção 10, com filtros por datas, curso, formador, cidade, origem e responsável; exportação respeitando as permissões.

**Fase H — Automações**
Os 6 cenários pedidos, com registo de execução, proteção contra repetição e interruptor para desligar. Ficam desligadas por defeito e nunca enviam mensagens reais em testes.

**Fase I — Meta Ads**
Verificar a integração que já existe; guardar o ID da lead, a campanha, o conjunto de anúncios, o anúncio, o formulário e o consentimento; importar as ~723 leads quando houver ficheiro. Não se inventam credenciais.

## 3. Proposta de início
Avançar já com as **Fases A e B** (base de dados + ficha única). Seguem-se C → D → E. As fases F e I esperam pelos ficheiros históricos e pelo ficheiro das leads Meta.

## 4. Critérios de aceitação
Os 10 critérios da secção 12 do documento, verificados com testes automáticos para as regras (inscrição sem duplicados, blocos, separação de valores, conclusão só com presenças validadas) e com uma verificação no ecrã em cada fase.

## Detalhes técnicos
- Só migrações aditivas; as colunas antigas `status`/`payment_status` ficam marcadas como DEPRECATED depois de copiadas para os novos campos.
- Unicidade parcial `(workspace_id, profile_id, cohort_id) where not duplicate_approved`, com verificação prévia dos 445 registos atuais.
- Permissões espelhadas em `capabilities.ts` (frontend e servidor); RLS com `get_user_workspace_ids()`.
- Regras de cálculo puras em `src/lib/studentJourney/` com testes vitest.
