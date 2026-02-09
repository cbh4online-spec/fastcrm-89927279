
# Editar Dados do Cliente nas Notas de Encomenda

## Objetivo
Adicionar a possibilidade de editar os dados do cliente (nome, email, telefone, NIF e enderecos) diretamente a partir da pagina de detalhe da nota de encomenda.

## Como vai funcionar
- No cartao "Dados do Cliente" aparecera um botao "Editar" (icone de lapis)
- Ao clicar, abre um Dialog/modal com um formulario pre-preenchido com os dados atuais do cliente
- Os campos editaveis serao: Nome, Email, Telefone, NIF, Endereco de Faturacao (rua, codigo postal, cidade, pais) e Endereco de Envio
- Ao guardar, os dados sao atualizados na tabela `client_users` e a pagina e recarregada

## Alteracoes Previstas

### 1. Criar componente `EditClientDataDialog`
- Novo ficheiro: `src/components/order-notes/EditClientDataDialog.tsx`
- Dialog com formulario para editar os campos do cliente
- Campos: nome, email, telefone, NIF, endereco de faturacao (rua, cod. postal, cidade, pais), endereco de envio (mesmos campos)
- Usa o hook `useClientUserActions` existente para persistir as alteracoes
- Inclui opcao de copiar endereco de faturacao para envio

### 2. Atualizar `OrderNoteDetail.tsx`
- Adicionar botao "Editar" no header do cartao "Dados do Cliente" (linha 207)
- Importar e renderizar o `EditClientDataDialog`
- Ao guardar com sucesso, chamar `refetch()` para atualizar os dados exibidos

## Detalhes Tecnicos

### Campos do formulario

| Campo | Origem | Tipo |
|-------|--------|------|
| Nome | `client_user.name` | text |
| Email | `client_user.email` | text/email |
| Telefone | `client_user.phone` | text |
| NIF | `client_user.tax_id` | text |
| Rua (faturacao) | `client_user.billing_address.street` | text |
| Cod. Postal (faturacao) | `client_user.billing_address.postal_code` | text |
| Cidade (faturacao) | `client_user.billing_address.city` | text |
| Pais (faturacao) | `client_user.billing_address.country` | text |
| Endereco de envio | Mesmos campos | text |

### Ficheiros afetados
- `src/components/order-notes/EditClientDataDialog.tsx` -- novo
- `src/components/order-notes/OrderNoteDetail.tsx` -- adicionar botao e dialog
