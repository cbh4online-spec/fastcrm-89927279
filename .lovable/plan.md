

# Inserir 5 Templates de Pedido de Documentação — Workspace Blecksen

## Contexto

O ficheiro DOCX contém os mesmos 5 templates de pedido de documentação para financiamento. A tabela `communication_templates` ainda não tem estes templates inseridos.

## O que será feito

Inserir 5 registos na tabela `communication_templates` usando o insert tool (não migração, pois é inserção de dados):

| # | Template | Assunto |
|---|----------|---------|
| 1 | Pedido Documentação — Empresas | Documentos para Financiamento — Empresas |
| 2 | Pedido Documentação — ENI | Documentos para Financiamento — ENI |
| 3 | Pedido Documentação — Conta de Outrem | Documentos para Financiamento — Conta de Outrem |
| 4 | Pedido Documentação — Conta Própria / Sócios Gerentes | Documentos para Financiamento — Conta Própria |
| 5 | Pedido Documentação — Garantia Jovem | Documentos para Financiamento — Garantia Jovem |

## Configuração de cada template

- **workspace_id**: `6d108e84-389c-42de-bd19-277f210823f2` (Blecksen)
- **created_by**: `2e9c047c-b035-4ff4-98e4-b5874c487c92` (owner)
- **channel**: `email`
- **language**: `pt`
- **tags**: `{Financiamento}`
- **is_active**: `true`
- **body**: texto limpo com listas de documentos
- **body_html**: HTML formatado com `<ul>/<li>`, links clicáveis, e `{{nome_cliente}}` para personalização

## Como

Uma única chamada SQL INSERT com 5 registos via insert tool. O conteúdo de cada template será extraído fielmente do DOCX, convertido em HTML limpo com:
- Saudação: `Estimado/a {{nome_cliente}}`
- Listas de documentos com `<ul>/<li>`
- Links clicáveis (Portal das Finanças, ePortugal, Banco de Portugal, etc.)
- Fecho: `Grata`

## Ficheiros alterados

Nenhum ficheiro do projecto será alterado. Apenas inserção de dados na base de dados.

