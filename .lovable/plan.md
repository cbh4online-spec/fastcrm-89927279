

# Corrigir erro ao criar relações: UUID inválido

## Problema
A coluna `source_object_id` e `target_object_id` na tabela `object_relationships` são do tipo **UUID**, mas o código envia strings como `"__core_contacts"` e `"__core_companies"`, causando o erro `invalid input syntax for type uuid`.

Não existem registos na tabela `core_object_types` para Contactos, Empresas ou Oportunidades.

## Solução

### Passo 1: Alterar colunas para tipo TEXT (migração DB)
Alterar `source_object_id` e `target_object_id` de `uuid` para `text`, permitindo IDs sintéticos como `__core_contacts` para entidades core.

```sql
ALTER TABLE object_relationships 
  ALTER COLUMN source_object_id TYPE text,
  ALTER COLUMN target_object_id TYPE text;
```

### Passo 2: Actualizar `useObjectRelationships.ts`
Na resolução de nomes de objectos, tratar IDs com prefixo `__core_` separadamente — mapear para nomes/ícones/slugs das definições core em vez de consultar `custom_objects`.

### Passo 3: Sem alterações no `RelationshipsPanel.tsx`
O formulário já funciona correctamente com os IDs `__core_*`. Apenas a base de dados e o hook de leitura precisam de ajuste.

