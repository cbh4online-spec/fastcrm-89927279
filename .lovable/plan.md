

# Adicionar 5 Templates de Pedido de Documentação ao Workspace Blecksen

## O que será feito

Inserir os 5 templates do ficheiro DOCX na tabela `communication_templates` do workspace **Blecksen** (`6d108e84-389c-42de-bd19-277f210823f2`), com tag `Financiamento`:

| Template | Assunto |
|----------|---------|
| Pedido Documentação — Empresas | Check-list documentos para financiamento de empresas |
| Pedido Documentação — ENI | Check-list documentos para ENI |
| Pedido Documentação — Conta de Outrem | Check-list documentos para trabalhadores por conta de outrem |
| Pedido Documentação — Conta Própria / Sócios Gerentes | Check-list documentos para conta própria e sócios gerentes |
| Pedido Documentação — Garantia Jovem | Check-list documentos para garantia jovem |

## Como

- Usar uma **migração SQL** com 5 `INSERT INTO communication_templates` (canal: `email`, tags: `["Financiamento"]`)
- O corpo de cada template será extraído do DOCX com formatação HTML limpa (listas de documentos com `<ul>/<li>`, links clicáveis, saudação e fecho)
- Usar variáveis `{{nome_cliente}}` no corpo para personalização
- `created_by`: utilizador existente do workspace (`0ab92eb1-91aa-43fd-97a8-e30ed63ce9da`)

## Ficheiros

| Ficheiro | Ação |
|----------|------|
| Nova migração SQL | Inserir 5 templates |

