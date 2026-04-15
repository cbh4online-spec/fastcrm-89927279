

# Diagnóstico: RLS INSERT Policy em `c2c_livestreams`

## Problema
A política RLS de INSERT verifica `seller_id = auth.uid()`, mas `seller_id` contém o `profiles.id` (não o auth UUID). O código correctamente resolve `profiles.id` a partir de `auth.uid()`, mas a política RLS rejeita porque compara valores de domínios diferentes.

**Policy actual:**
```sql
WITH CHECK (seller_id = auth.uid())  -- auth.uid() ≠ profiles.id
```

**Código actual (correcto):**
```typescript
seller_id: profile.id  -- profiles.id (diferente de auth.uid())
```

## Solução
Migração SQL para corrigir as políticas INSERT, UPDATE e DELETE, usando uma subquery que resolve `auth.uid()` → `profiles.id`:

```sql
-- Drop existing broken policies
DROP POLICY IF EXISTS "Sellers can create livestreams" ON public.c2c_livestreams;
DROP POLICY IF EXISTS "Sellers can update own livestreams" ON public.c2c_livestreams;
DROP POLICY IF EXISTS "Sellers can delete own livestreams" ON public.c2c_livestreams;

-- Recreate with correct profile.id resolution
CREATE POLICY "Sellers can create livestreams" ON public.c2c_livestreams
  FOR INSERT TO authenticated
  WITH CHECK (
    seller_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
  );

CREATE POLICY "Sellers can update own livestreams" ON public.c2c_livestreams
  FOR UPDATE TO authenticated
  USING (
    seller_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
  );

CREATE POLICY "Sellers can delete own livestreams" ON public.c2c_livestreams
  FOR DELETE TO authenticated
  USING (
    seller_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
  );
```

## Impacto
- Corrige o erro de RLS ao criar livestreams
- Mantém segurança: cada vendedor só pode gerir as suas próprias lives
- Sem alterações no código frontend (já está correcto)

