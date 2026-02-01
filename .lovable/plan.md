

# Plano: Actualizar Estado para "Ativo" em Perfis Existentes

## Problema Identificado

Actualmente, quando o processo de importação encontra um perfil SJ já existente:
- **Perfis novos**: são criados com `lifecycle_stage: "active"` ✓
- **Perfis existentes**: mantêm o estado anterior (lead, prospect, completed, etc.) ✗

Os perfis que já estão na base de dados com estados como "lead" ou "completed" não são actualizados para "active" quando recebem inscrições em cursos.

## Solução

Adicionar uma actualização do `lifecycle_stage` para "active" nos perfis existentes quando são processados e têm cursos associados.

## Alteração Técnica

No bloco onde encontramos um perfil existente (linha 406-408), adicionar a actualização do estado:

```typescript
} else {
  processingResult.profilesExisting++;
  
  // Actualizar lifecycle_stage para "active" se tem cursos
  if (row.courses.length > 0) {
    await supabase
      .from("sj_profiles")
      .update({ lifecycle_stage: "active" })
      .eq("id", profile.id);
  }
}
```

## Ficheiro a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/student-journey/BulkEnrollmentDialog.tsx` | Adicionar update do lifecycle_stage para perfis existentes |

## Resultado Esperado

1. Perfis novos são criados com `lifecycle_stage: "active"` ✓ (já funciona)
2. Perfis existentes que estavam como "lead", "prospect", "completed" ou outro estado → passam para "active"
3. Todos os contactos importados com cursos ficam com estado "Ativo"

