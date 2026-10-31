# Auditoria FastCRM Quality AI — Contactos (/dashboard/contacts)

Modo: AUDITORIA (sem alterar código). As correções só avançam com aprovação.

## Já confirmado
- CT-01 (P1): na edição de um contacto não é possível apagar o email, o telefone, a empresa, o cargo, as notas nem as redes sociais. O campo esvazia-se no ecrã, mas o valor antigo fica guardado (mesmo erro que os Leads tinham).

## O que vou verificar
1. Lista: pesquisa sem distinguir maiúsculas nem acentos, filtros, ordenação, paginação, números do topo, colunas e alinhamento.
2. Criar / editar / importar CSV: validação, duplicados (NIF/email), telefone, campos que não se conseguem limpar.
3. Ficha do contacto: separadores, próxima tarefa, botão WhatsApp (opt-out), vendedor herdado da empresa.
4. Isolamento por espaço de trabalho e permissões (leitura, escrita, eliminação, fusão).
5. Ecrã: 1440x900, 768x1024, 390x844, incluindo janelas abertas, lista vazia e estados de carregamento.
6. Testes existentes de contactos.

## Entregável
Relatório com IDs CT-xx, prioridade, provas, impacto, correção proposta, pontuação e veredito.

## Detalhes técnicos
- Ficheiros: `ContactsListIX.tsx`, `EditContactDialog.tsx` (linhas 92-104 `|| undefined`), `CreateContactDialog.tsx`, `ContactsCsvImportDialog.tsx`, `useContacts.ts`, `useSmartContacts.ts`, ficha de contacto, RLS de `contacts`.
- Correção prevista para CT-01: `|| null` em vez de `|| undefined`, com teste.
