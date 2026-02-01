

# Plano: Remover Contactos Duplicados com Segurança

## Resumo da Análise

| Métrica | Valor |
|---------|-------|
| Grupos de duplicados | 12 |
| Contactos a remover | 16 |
| Contactos a manter | 12 (o mais antigo de cada grupo) |

## Situação Crítica Detectada

Alguns contactos duplicados têm **perfis de alunos com inscrições** que precisam ser migrados antes da remoção:

| Contacto | Perfil Associado | Inscrições | Acção |
|----------|-----------------|------------|-------|
| Jaqueline Lopes Correia | Sim (active) | 1 | Migrar perfil para contacto original |
| Neide Janete Barroso da Costa | Sim (active) | 2 | Migrar perfil para contacto original |
| Anita Cabeleireiro e Estética | Sim (lead) | 0 | Eliminar perfil órfão |
| Joana Gonçalves Baselga Elistudio | Sim (lead) | 0 | Eliminar perfil órfão |

## Passos de Execução

### Passo 1: Migrar perfis com inscrições para contactos originais

```sql
-- Migrar perfil da Jaqueline para contacto original
UPDATE sj_profiles 
SET contact_id = 'bc37ed4b-cb51-4d6a-84a7-0cb0b27d2406'
WHERE id = 'ae257394-7c22-4ef4-8455-f3eac0ef734a';

-- Migrar perfil da Neide para contacto original
UPDATE sj_profiles 
SET contact_id = '2be0491d-cb12-465f-95ec-2c8995ad0f9e'
WHERE id = '9b9bb297-4042-4cf1-9126-e95ed137d01c';
```

### Passo 2: Eliminar perfis órfãos (sem inscrições)

```sql
DELETE FROM sj_profiles 
WHERE contact_id IN (
  'ceb87802-7b9b-475d-be7c-f244fd3d50ca',
  '3eedfc4d-c760-4a0d-9522-c6a9643bae5a'
);
```

### Passo 3: Remover contactos duplicados

```sql
WITH duplicates AS (
  SELECT 
    LOWER(TRIM(name)) as normalized_name,
    LOWER(TRIM(COALESCE(email, ''))) as normalized_email,
    array_agg(id ORDER BY created_at ASC) as contact_ids
  FROM contacts
  GROUP BY LOWER(TRIM(name)), LOWER(TRIM(COALESCE(email, '')))
  HAVING COUNT(*) > 1
),
ids_to_delete AS (
  SELECT unnest(contact_ids[2:]) as id
  FROM duplicates
)
DELETE FROM contacts
WHERE id IN (SELECT id FROM ids_to_delete);
```

## Resultado Esperado

| Antes | Depois |
|-------|--------|
| 16 contactos duplicados | 0 contactos duplicados |
| Perfis com referências inválidas | Todos os perfis migrados correctamente |
| Dados de inscrições em risco | Inscrições preservadas |

## Segurança

- As inscrições (3 no total) serão preservadas através da migração dos perfis
- Apenas contactos verdadeiramente duplicados serão removidos
- O contacto mais antigo de cada grupo será sempre mantido

