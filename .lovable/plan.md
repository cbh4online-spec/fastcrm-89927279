

# Plano: Corrigir Políticas RLS para Tabela ai_personas

## Diagnóstico Confirmado

O erro "new row violates row-level security policy for table 'ai_personas'" acontece porque:

| Situação | Resultado |
|----------|-----------|
| Super Admin a aceder workspace de outro utilizador | Pode **ver** o workspace (via código) |
| Super Admin a tentar criar perfis nesse workspace | **BLOQUEADO** pela RLS |

### Análise das Políticas Actuais

A tabela `ai_personas` tem apenas 2 políticas:

```sql
-- Política 1: SELECT
"Users can view AI personas in their workspace" 
USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()))

-- Política 2: ALL (SELECT, INSERT, UPDATE, DELETE)
"Users can manage AI personas in their workspace"
USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()))
WITH CHECK: NULL  -- ⚠️ PROBLEMA: Não tem WITH CHECK!
```

### Por que Falha?

1. A política `FOR ALL` com `USING` mas sem `WITH CHECK` pode causar problemas em INSERT
2. Não existe exceção para Super Admins (que podem aceder workspaces sem serem membros)
3. O sistema verifica `auth.uid()` na tabela `workspace_members`, mas Super Admins acedem via `user_roles`

---

## Solução: Adicionar Políticas para Super Admins

Vou criar políticas RLS que permitem Super Admins gerir perfis de IA em qualquer workspace, seguindo o padrão já usado em outras tabelas (leads, contacts, products).

### Migração SQL a Aplicar

```sql
-- 1. Adicionar política de SELECT para Super Admins
CREATE POLICY "Super admins can view all ai_personas"
  ON public.ai_personas
  FOR SELECT
  USING (public.is_super_admin(auth.uid()));

-- 2. Adicionar política de INSERT para Super Admins
CREATE POLICY "Super admins can insert ai_personas"
  ON public.ai_personas
  FOR INSERT
  WITH CHECK (public.is_super_admin(auth.uid()));

-- 3. Adicionar política de UPDATE para Super Admins
CREATE POLICY "Super admins can update all ai_personas"
  ON public.ai_personas
  FOR UPDATE
  USING (public.is_super_admin(auth.uid()));

-- 4. Adicionar política de DELETE para Super Admins
CREATE POLICY "Super admins can delete all ai_personas"
  ON public.ai_personas
  FOR DELETE
  USING (public.is_super_admin(auth.uid()));

-- 5. Corrigir a política existente adicionando WITH CHECK
DROP POLICY IF EXISTS "Users can manage AI personas in their workspace" ON public.ai_personas;

CREATE POLICY "Users can manage AI personas in their workspace"
  ON public.ai_personas
  FOR ALL
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
```

---

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| Nova migração SQL | Adicionar 4 políticas para Super Admins + corrigir política existente |

---

## Verificação Após Implementação

1. Super Admin acede a workspace de outro utilizador
2. Clica em "Criar Perfis Base"
3. Perfis são criados com sucesso
4. Perfis aparecem na lista

---

## Secção Técnica

### Por que o WITH CHECK é necessário?

Em PostgreSQL RLS, para operações `INSERT`:
- A cláusula `USING` define quais linhas podem ser **vistas/modificadas**
- A cláusula `WITH CHECK` define quais valores podem ser **inseridos**

Sem `WITH CHECK`, a política `FOR ALL` pode:
- Funcionar para SELECT, UPDATE, DELETE (usa USING)
- Falhar para INSERT (precisa de WITH CHECK)

### Padrão de Super Admin já usado no projecto

Outras tabelas como `leads`, `contacts`, `products` já têm:

```sql
CREATE POLICY "Super admins can view all X" 
  ON public.X FOR SELECT 
  USING (is_super_admin(auth.uid()));
```

Esta solução aplica o mesmo padrão à tabela `ai_personas`.

