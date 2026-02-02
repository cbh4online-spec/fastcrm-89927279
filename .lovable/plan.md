
# Plano: Corrigir Relação entre Proposals e Profiles

## Problema Identificado

A query falha com erro 400:
```
Could not find a relationship between 'proposals' and 'profiles' 
using the hint 'proposals_assigned_to_fkey'
```

A migração anterior criou:
```sql
ALTER TABLE proposals ADD COLUMN assigned_to uuid REFERENCES auth.users(id);
```

Mas a query tenta fazer join com `profiles`:
```typescript
assigned_to_profile:profiles!proposals_assigned_to_fkey(id, full_name, email, avatar_url)
```

O PostgREST não consegue inferir esta relação porque a FK aponta para `auth.users`, não para `profiles`.

---

## Solução

Criar uma nova FK que referencie `profiles(user_id)` directamente. Como `profiles.user_id` tem constraint UNIQUE, pode ser usada como target de uma FK.

### Migração SQL

```sql
-- Remove a FK antiga que aponta para auth.users
ALTER TABLE proposals 
  DROP CONSTRAINT IF EXISTS proposals_assigned_to_fkey;

-- Cria nova FK que aponta para profiles(user_id)
-- Isto permite ao PostgREST fazer o join automaticamente
ALTER TABLE proposals
  ADD CONSTRAINT proposals_assigned_to_fkey 
  FOREIGN KEY (assigned_to) 
  REFERENCES profiles(user_id) 
  ON DELETE SET NULL;
```

### Por que funciona

| Antes | Depois |
|-------|--------|
| `proposals.assigned_to` → `auth.users(id)` | `proposals.assigned_to` → `profiles(user_id)` |
| PostgREST não consegue inferir relação com `profiles` | PostgREST detecta FK e permite join com hint |

O `profiles.user_id` tem constraint `UNIQUE`, permitindo ser usado como target de FK.

---

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| Nova migração SQL | Alterar FK de `auth.users(id)` para `profiles(user_id)` |

---

## Resultado Esperado

- Query de propostas volta a funcionar
- Join com `profiles` é feito correctamente
- Campo `assigned_to_profile` retorna dados do responsável
- Todas as funcionalidades anteriores mantidas

---

## Risco

**Baixo** - A alteração apenas muda o target da FK. Os dados existentes (se houver) continuam válidos porque `profiles.user_id` corresponde aos mesmos IDs de `auth.users(id)`.
