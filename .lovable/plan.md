

# Plano: Corrigir Políticas RLS para Tabelas de Knowledge Base

## Diagnóstico

O utilizador (Super Admin) está a tentar criar uma Base de Conhecimento num workspace onde não é membro directo. O erro:

```
"new row violates row-level security policy for table \"knowledge_bases\""
```

### Tabelas Afectadas

| Tabela | Políticas Actuais | Problema |
|--------|-------------------|----------|
| `knowledge_bases` | 2 políticas (SELECT, ALL) | Sem Super Admin, sem WITH CHECK |
| `knowledge_sources` | 2 políticas (SELECT, ALL) | Sem Super Admin, sem WITH CHECK |
| `knowledge_entries` | 2 políticas (SELECT, ALL) | Sem Super Admin, sem WITH CHECK |

---

## Solução

Aplicar o mesmo padrão usado para `ai_personas` e outras tabelas: adicionar políticas RLS para Super Admins em todas as 3 tabelas.

### SQL a Aplicar

```sql
-- ==========================================
-- knowledge_bases - Super Admin policies
-- ==========================================

CREATE POLICY "Super admins can view all knowledge_bases"
  ON public.knowledge_bases FOR SELECT
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can insert knowledge_bases"
  ON public.knowledge_bases FOR INSERT
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update all knowledge_bases"
  ON public.knowledge_bases FOR UPDATE
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete all knowledge_bases"
  ON public.knowledge_bases FOR DELETE
  USING (public.is_super_admin(auth.uid()));

-- Corrigir política existente com WITH CHECK
DROP POLICY IF EXISTS "Users can manage knowledge bases in their workspace" 
  ON public.knowledge_bases;

CREATE POLICY "Users can manage knowledge bases in their workspace"
  ON public.knowledge_bases FOR ALL
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- ==========================================
-- knowledge_sources - Super Admin policies
-- ==========================================

CREATE POLICY "Super admins can view all knowledge_sources"
  ON public.knowledge_sources FOR SELECT
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can insert knowledge_sources"
  ON public.knowledge_sources FOR INSERT
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update all knowledge_sources"
  ON public.knowledge_sources FOR UPDATE
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete all knowledge_sources"
  ON public.knowledge_sources FOR DELETE
  USING (public.is_super_admin(auth.uid()));

-- Corrigir política existente
DROP POLICY IF EXISTS "Users can manage knowledge sources in their workspace" 
  ON public.knowledge_sources;

CREATE POLICY "Users can manage knowledge sources in their workspace"
  ON public.knowledge_sources FOR ALL
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- ==========================================
-- knowledge_entries - Super Admin policies
-- ==========================================

CREATE POLICY "Super admins can view all knowledge_entries"
  ON public.knowledge_entries FOR SELECT
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can insert knowledge_entries"
  ON public.knowledge_entries FOR INSERT
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update all knowledge_entries"
  ON public.knowledge_entries FOR UPDATE
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete all knowledge_entries"
  ON public.knowledge_entries FOR DELETE
  USING (public.is_super_admin(auth.uid()));

-- Corrigir política existente
DROP POLICY IF EXISTS "Users can manage knowledge entries in their workspace" 
  ON public.knowledge_entries;

CREATE POLICY "Users can manage knowledge entries in their workspace"
  ON public.knowledge_entries FOR ALL
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
```

---

## Resumo das Alterações

| Tabela | Novas Políticas |
|--------|-----------------|
| `knowledge_bases` | +4 Super Admin (SELECT, INSERT, UPDATE, DELETE) + fix WITH CHECK |
| `knowledge_sources` | +4 Super Admin (SELECT, INSERT, UPDATE, DELETE) + fix WITH CHECK |
| `knowledge_entries` | +4 Super Admin (SELECT, INSERT, UPDATE, DELETE) + fix WITH CHECK |

**Total: 12 novas políticas + 3 políticas corrigidas**

---

## Resultado Esperado

Após aplicar a migração:
1. Super Admin pode criar bases de conhecimento em qualquer workspace
2. Super Admin pode adicionar fontes (URLs, documentos) em qualquer workspace
3. Super Admin pode criar/editar/validar entradas em qualquer workspace
4. Utilizadores normais continuam com acesso apenas aos seus workspaces

