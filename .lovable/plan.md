

# Plano: Corrigir Políticas RLS para Metas de Produtividade

## Problema Identificado

As metas de produtividade não estão a ser registadas devido a **políticas de Row Level Security (RLS) incompletas**. Os logs da base de dados mostram:

```
"new row violates row-level security policy for table \"productivity_goals\""
```

### Análise das Políticas Actuais

| Política | Comando | Condição |
|----------|---------|----------|
| Admins can create organizational goals | INSERT | `goal_scope = 'organizational'` E utilizador é owner/admin |
| Users can create goals | INSERT | workspace_id pertence ao utilizador (sem verificar user_id ou scope) |

### Cenários que Falham

1. **Owner/Admin a criar meta individual para OUTRO utilizador** - O user_id da meta é diferente de `auth.uid()`, e não há política que permita isto
2. **Utilizador regular a criar meta individual própria** - Pode falhar se a política não validar correctamente o user_id = auth.uid()

## Solução

Reorganizar as políticas de INSERT para cobrir todos os cenários correctamente:

### 1. Política para Metas Individuais

Permitir criar metas individuais se:
- O utilizador pertence ao workspace **E**
- A meta é para si próprio (user_id = auth.uid()) **OU** o utilizador é owner/admin

### 2. Política para Metas Organizacionais  

Manter a lógica actual: apenas owners/admins podem criar metas organizacionais.

## Alterações na Base de Dados

```sql
-- 1. Remover a política genérica problemática
DROP POLICY IF EXISTS "Users can create goals" ON productivity_goals;

-- 2. Criar política para metas individuais próprias
CREATE POLICY "Users can create own individual goals"
ON productivity_goals FOR INSERT
WITH CHECK (
  -- Meta individual
  goal_scope = 'individual' 
  AND
  -- User_id é o próprio utilizador
  user_id = auth.uid()
  AND
  -- Pertence ao workspace
  workspace_id IN (
    SELECT workspace_id FROM workspace_members 
    WHERE user_id = auth.uid()
  )
);

-- 3. Criar política para admins criarem metas individuais para outros
CREATE POLICY "Admins can create individual goals for members"
ON productivity_goals FOR INSERT
WITH CHECK (
  -- Meta individual
  goal_scope = 'individual'
  AND
  -- User_id é um membro válido do workspace
  user_id IN (
    SELECT user_id FROM workspace_members 
    WHERE workspace_id = productivity_goals.workspace_id
  )
  AND
  -- Quem insere é owner/admin
  EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = productivity_goals.workspace_id
    AND user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
);
```

## Resumo das Políticas Finais

| Cenário | Política Aplicável |
|---------|-------------------|
| Owner cria meta organizacional | "Admins can create organizational goals" |
| Owner cria meta individual para si | "Users can create own individual goals" |
| Owner cria meta individual para membro | "Admins can create individual goals for members" |
| Membro cria meta individual para si | "Users can create own individual goals" |
| Membro tenta criar meta organizacional | **Bloqueado** (correcto) |
| Membro tenta criar meta para outro | **Bloqueado** (correcto) |

## Ficheiros a Modificar

| Tipo | Alteração |
|------|-----------|
| Migração SQL | Reorganizar políticas RLS de INSERT para productivity_goals |

## Resultado Esperado

1. Owners/admins podem criar metas organizacionais e individuais (para qualquer membro)
2. Membros regulares podem criar metas individuais apenas para si próprios
3. Todas as operações de criação de metas funcionarão sem erros de RLS

