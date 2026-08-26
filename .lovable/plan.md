# Fundir contactos, empresas e leads (fusão manual)

Hoje a fusão só existe através do detetor automático de duplicados (diálogo "Duplicados" nas tabelas Smart). Nas listagens IX que estão em uso (Contactos, Empresas, Leads) não há forma de escolher dois ou mais registos e fundi-los manualmente. É isso que se acrescenta.

## Comportamento

### Seleção nas listagens
- Coluna de seleção (checkbox) no cabeçalho e em cada linha das listas de Contactos, Empresas e Leads.
- Checkbox no cabeçalho seleciona/limpa a página atual.
- Ao existir seleção, aparece uma barra de ações com "N selecionados", botão **Fundir** (ativo com 2 ou mais) e "Limpar seleção".

### Diálogo de fusão
- Mostra os registos selecionados lado a lado.
- Escolha do **registo principal** (o que sobrevive); por omissão o mais antigo/mais completo.
- Pré-visualização campo a campo: para cada campo vazio no principal indica-se o valor que será herdado, com origem. Campos em conflito mantêm o valor do principal (indicado visualmente).
- Resumo do que será transferido: oportunidades, propostas, faturas, conversas, contactos associados (empresas), tags e notas.
- Aviso claro: os registos secundários são eliminados após a transferência; ação irreversível.
- Confirmação explícita antes de executar.

### Regras
- Só é permitido fundir registos do mesmo tipo e do mesmo workspace.
- Registos bloqueados podem ser fundidos, mas o estado bloqueado do principal é preservado; se algum secundário estiver bloqueado, o principal fica bloqueado (fail-safe) e é mostrado aviso.
- Notas dos secundários ficam anexadas às notas do principal com data e nome de origem (comportamento já existente).
- A ação fica registada em auditoria (activity_logs) com autor, principal, secundários e nº de referências migradas.

### Acesso rápido a duplicados
- Botão "Duplicados" no cabeçalho das três listagens IX, abrindo o detetor automático já existente (UnifiedDuplicateDialog), hoje só acessível nas tabelas Smart.

## Estrutura técnica

- Hooks de fusão já existentes e reutilizados sem alterações de contrato: `useContactMerge`, `useCompanyMerge`, `useLeadMerge`.
- Melhorias nos hooks: envolver a fusão numa sequência com verificação de erros por passo, uniformizar o `useLeadMerge` (hoje sem migração de faturas/tarefas nem evento de kernel) e registar auditoria em `activity_logs`.
- Novo componente partilhado `src/components/entity/EntityMergeDialog.tsx` — recebe `entityType`, os registos selecionados e delega no hook certo.
- Novo hook `src/hooks/useEntityListSelection.ts` para gerir a seleção múltipla nas listas.
- Nova barra `src/components/entity/EntitySelectionBar.tsx` (contagem + Fundir + Limpar).
- Alterações em `ContactsListIX.tsx`, `CompaniesListIX.tsx`, `LeadsListIX.tsx`: coluna de checkbox, barra de seleção, diálogos e botão "Duplicados".
- Invalidação de queries das listas, KPIs e grupos de duplicados após fusão.

## Critérios de aceitação
- Selecionar 2+ registos numa listagem e fundir resulta num único registo com dados consolidados.
- Referências (oportunidades, propostas, faturas, conversas, contactos) deixam de apontar para os registos eliminados.
- Fusão com apenas 1 selecionado está desativada.
- Após fusão, listas e KPIs atualizam sem recarregar a página.
- Fusão registada em auditoria.

## Riscos e pontos por validar
- A fusão elimina definitivamente os secundários. Alternativa possível (não incluída): arquivar em vez de eliminar, mantendo referência ao principal.
- Podem existir tabelas com referência a contactos/empresas/leads não cobertas pela migração atual (ex.: tarefas, campanhas, sequências); é feita uma passagem ao esquema para incluir as relevantes.
