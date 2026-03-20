

# Mostrar todas as colunas na tabela de importação de fornecedores

## Problema

O modal `SupplierImportModal` faz parse de 6 campos (name, email, vat_number, phone, category, address) mas a tabela de preview só mostra 4 colunas: Nome, Email, NIF/NIPC, Categoria. Os campos **Telefone** e **Morada** estão a ser importados mas não são visíveis na pré-visualização.

## Alteração

**Ficheiro**: `src/components/procurement/SupplierImportModal.tsx`

Adicionar duas colunas à tabela de preview:
- **Telefone** (`phone`) — entre NIF/NIPC e Categoria
- **Morada** (`address`) — após Categoria

Adicionar os `<TableHead>` e `<TableCell>` correspondentes, com scroll horizontal para acomodar as 6 colunas sem quebrar o layout no mobile.

