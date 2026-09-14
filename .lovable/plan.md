# Alinhar formulários de Leads e Empresas ao de Contactos

## Diagnóstico

- O formulário de Contacto tem uma estrutura curta: Nome, Email e Telefone visíveis, e tudo o resto (empresa, cargo, morada, tags, notas, campos personalizados) dentro de uma secção recolhível "Campos opcionais". Mostra ainda o aviso de duplicados e as sugestões automáticas no corpo do formulário.
- O formulário de Lead mostra hoje, de uma vez, tipo de lead, NIF, setor, website, nº de funcionários, pessoa de contacto, cargo, morada, empresa, email, telefone, origem, estado e campos personalizados. Só a morada está recolhida.
- O formulário de Empresa mostra logo nome, NIF com pesquisa, website, email e mais campos, com uma secção opcional própria e comportamentos diferentes.
- A edição de Contacto e de Empresa tem janelas próprias. A Lead não tem janela de edição: é editada diretamente na ficha.

## O que vai ficar igual ao de Contactos

Estrutura, obrigatoriedade mínima, aspeto dos campos e apresentação de avisos/sugestões.

### Novo Lead
- Visível de início: Tipo de Lead (Pessoa/Empresa), Nome, Email, Telefone.
- Dentro de "Campos opcionais" (fechado): NIF com pesquisa e resultado (só no tipo Empresa), Setor, Website, Empresa, Morada completa, Origem, Estado, Tags, Notas e campos personalizados.
- Sai do formulário (passa a preencher-se na ficha depois de criar): Nº de Funcionários, Pessoa de Contacto e Cargo da pessoa de contacto.
- Obrigatório: apenas o Nome.
- Aviso de duplicado apresentado no formulário, no mesmo formato do de Contactos, com opção de abrir o registo existente.

### Nova Empresa
- Visível de início: Nome, Email, Telefone.
- Dentro de "Campos opcionais" (fechado): NIF com pesquisa e cartão de dados obtidos, Website, Setor, Morada completa, Tags, Notas, criar contacto associado e campos personalizados.
- Obrigatório: apenas o Nome.
- O aviso de duplicados deixa de ser uma janela separada e passa a aparecer no próprio formulário, como no de Contactos, com "Usar este" ou "Criar mesmo assim".
- Mantém-se a deteção de empresário em nome individual pelo NIF e a criação automática do contacto associado.

### Edição
- A janela de editar Empresa fica com a mesma organização: Nome, Email, Telefone visíveis e o resto em "Campos opcionais", com o mesmo espaçamento e etiquetas da de editar Contacto.
- A janela de editar Contacto ganha a mesma secção recolhível e o bloco de morada, para ficar coerente.
- Para Leads, como não existe janela de edição, é criada uma janela "Editar Lead" com a mesma estrutura, aberta a partir da ficha e da listagem.

## Detalhes técnicos

- Componente partilhado novo `src/components/crm/shared/EntityFormLayout.tsx` com o padrão: bloco principal, `Collapsible` "Campos opcionais", bloco de morada e rodapé, para reutilização nos seis formulários.
- Componente partilhado `DuplicateWarningCard` extraído do padrão já existente em `CreateContactDialog.tsx`, parametrizado por tipo de entidade, usado por Lead e Empresa (`useCompanyDuplicateCheck`, e verificação equivalente para leads por email/telefone/nome).
- `CreateLeadDialog.tsx`: mantém `react-hook-form` + zod; schema passa a ter só `name` obrigatório e remove `number_of_employees`, `contact_person`, `contact_person_role`.
- `CreateCompanyDialog.tsx`: remove `AlertDialog` de duplicados, passa a render inline; validação passa a exigir só `name` (hoje exige nome + website/email).
- Nova `EditLeadDialog.tsx` a usar `useUpdateLead`, com filtro por `workspace_id` e invalidação das queries de leads; ligada em `LeadsListIX.tsx` e na ficha da lead.
- `EditCompanyDialog.tsx` e `EditContactDialog.tsx` reorganizados sobre o mesmo layout, sem alterar as mutações nem os campos guardados.
- Nenhuma alteração de base de dados, RLS ou edge functions. Validação final com `bunx tsgo --noEmit -p tsconfig.app.json`.

## Critérios de aceitação

- Criar uma lead ou empresa só com o Nome funciona, sem erros de validação.
- Os três formulários de criação abrem com o mesmo aspeto: campos principais e uma linha "Campos opcionais" fechada.
- Duplicados de lead e empresa aparecem como aviso dentro do formulário, com ação para abrir o registo existente.
- Campos removidos do formulário de lead continuam editáveis na ficha, sem perda de dados existentes.
- Editar lead, contacto e empresa usa a mesma organização visual.

## Riscos

- Os campos retirados do formulário de lead deixam de ser preenchíveis no momento da criação, incluindo em importações manuais rápidas.
- A mudança do aviso de duplicados de empresa altera um fluxo existente que alguns utilizadores já conhecem.
