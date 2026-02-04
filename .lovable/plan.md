
# Plano: Adicionar Acesso Global de Super Admin às Políticas RLS

## Problema Identificado

O utilizador **Jorge Cardoso** é um **super_admin** mas as políticas RLS da tabela `productivity_goals` não concedem acesso global adequado:

### Situação Actual

| Operação | Política | Verifica Super Admin? |
|----------|----------|----------------------|
| SELECT | "Users can view goals in their workspace" | **NÃO** |
| SELECT | "Users can view organizational goals in their workspace" | **NÃO** |
| INSERT (individual) | "Users can create own individual goals" | **NÃO** |
| INSERT (individual) | "Admins can create individual goals for members" | **SIM** |
| INSERT (organizational) | "Admins can create organizational goals" | **SIM** |
| UPDATE | "Users can update their goals" | **NÃO** |
| DELETE | "Users can delete their goals" | **NÃO** |

### Problema Específico

O super admin está no workspace **PHARLISS** (via o contexto da aplicação), mas **não é membro directo** desse workspace. As políticas de INSERT para super admins estão correctas, mas:

1. A política de **SELECT** bloqueia a visualização (o que pode causar problemas no frontend)
2. A política para metas **individuais por membros** (`Users can create own individual goals`) não aceita super admins

## Solução

Actualizar **TODAS** as políticas de `productivity_goals` para incluir verificação de `is_super_admin()`:

### 1. Políticas de SELECT

```sql
-- Actualizar SELECT para incluir super admins
DROP POLICY IF EXISTS "Users can view goals in their workspace" ON productivity_goals;
DROP POLICY IF EXISTS "Users can view organizational goals in their workspace" ON productivity_goals;

CREATE POLICY "Users can view goals in their workspace"
ON productivity_goals FOR SELECT
USING (
  public.is_super_admin()
  OR
  workspace_id IN (
    SELECT workspace_id FROM workspace_members 
    WHERE user_id = auth.uid()
  )
);
```

### 2. Políticas de UPDATE

```sql
DROP POLICY IF EXISTS "Users can update their goals" ON productivity_goals;
DROP POLICY IF EXISTS "Members can update organizational goals" ON productivity_goals;

CREATE POLICY "Users can update goals"
ON productivity_goals FOR UPDATE
USING (
  public.is_super_admin()
  OR
  user_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = productivity_goals.workspace_id
    AND user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
);
```

### 3. Políticas de DELETE

```sql
DROP POLICY IF EXISTS "Users can delete their goals" ON productivity_goals;
DROP POLICY IF EXISTS "Admins can delete organizational goals" ON productivity_goals;

CREATE POLICY "Users can delete goals"
ON productivity_goals FOR DELETE
USING (
  public.is_super_admin()
  OR
  user_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = productivity_goals.workspace_id
    AND user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
);
```

## Resumo das Políticas Finais

| Operação | Condições |
|----------|-----------|
| SELECT | Super admin **OU** membro do workspace |
| INSERT (individual própria) | Membro do workspace E user_id = auth.uid() |
| INSERT (individual para outros) | Super admin **OU** owner/admin do workspace |
| INSERT (organizacional) | Super admin **OU** owner/admin do workspace |
| UPDATE | Super admin **OU** owner da meta **OU** admin do workspace |
| DELETE | Super admin **OU** owner da meta **OU** admin do workspace |

## Alterações na Base de Dados

| Tipo | Descrição |
|------|-----------|
| Migração SQL | Reorganizar políticas RLS para incluir `is_super_admin()` em SELECT, UPDATE e DELETE |

## Resultado Esperado

1. Super admins podem ver, criar, editar e apagar metas em **qualquer** workspace
2. Owners/admins continuam a poder gerir metas nos seus próprios workspaces
3. Utilizadores regulares podem gerir apenas as suas próprias metas individuais
