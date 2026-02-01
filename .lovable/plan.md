

# Plano: Corrigir Estados dos Perfis Existentes

## Problema Identificado

A importação foi executada **antes** da alteração do código ter sido implementada. Os perfis actualizados às 18:31 continuam com estado "completed" em vez de "active".

**Dados actuais:**
- 943 perfis com estado "lead"
- 65 perfis com estado "completed"  
- 6 perfis com estado "active"

Muitos destes perfis têm inscrições em cursos mas mantêm estados incorrectos.

## Solução

Executar uma **actualização directa na base de dados** para corrigir todos os perfis que:
- Têm pelo menos 1 inscrição (curso)
- Estado actual diferente de "active"

## Comando SQL a Executar

```sql
UPDATE sj_profiles 
SET lifecycle_stage = 'active'
WHERE id IN (
  SELECT DISTINCT p.id 
  FROM sj_profiles p
  INNER JOIN sj_enrollments e ON e.profile_id = p.id
  WHERE p.lifecycle_stage != 'active'
);
```

## Impacto Esperado

| Antes | Depois |
|-------|--------|
| 943 leads (muitos com cursos) | Apenas leads SEM cursos |
| 65 completed | Apenas completed SEM cursos activos |
| 6 active | Todos com inscrições = active |

## Alternativa

Se preferir, posso adicionar um **botão "Sincronizar Estados"** no painel de administração para permitir esta correcção manual sempre que necessário.

