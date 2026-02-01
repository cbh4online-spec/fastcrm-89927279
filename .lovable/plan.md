
# Plano: Link para Student Journey no Detalhe de Contacto

## Objetivo

Adicionar um link/botão para o Student Journey na página de detalhe do contacto, visível apenas quando:
1. O módulo "student-journey" está instalado no workspace **OU**
2. O contacto já tem um perfil associado no Student Journey

## Análise do Cenário Actual

### Dados Relevantes
- A tabela `sj_profiles` tem coluna `contact_id` que liga perfis a contactos CRM
- O contacto actual (ID: `8a1ed353-...`) já tem um perfil SJ associado
- Existe o hook `useWorkspaceModules` com função `isModuleInstalled('student-journey')`

### Componente Alvo
- `src/components/contacts/eni/ENIContactDetailWithSidebar.tsx`
- Menu lateral: `src/components/entity/EntitySidebarMenu.tsx`

## Solução Proposta

### Abordagem 1: Adicionar ao Menu Lateral (Recomendada)

Adicionar uma nova secção "MÓDULOS" no `EntitySidebarMenu` que mostra links para módulos activos relacionados com a entidade.

**Vantagens:**
- Consistente com o padrão existente
- Permite expandir para outros módulos futuramente

### Alterações Necessárias

#### 1. Novo Tipo de Secção no Menu

Adicionar `'student-journey'` ao tipo `MenuSection` em `src/types/entity.ts`:

```typescript
export type MenuSection = 
  | 'overview' 
  // ... existing ...
  | 'orders'
  | 'student-journey'; // Novo
```

#### 2. Novo Hook: `useContactStudentJourneyProfile`

Criar hook para verificar se contacto tem perfil SJ:

**Ficheiro:** `src/hooks/useContactStudentJourneyProfile.ts`

```typescript
export function useContactStudentJourneyProfile(contactId: string | undefined) {
  const { currentWorkspace } = useWorkspace();
  
  return useQuery({
    queryKey: ["sj-profile-by-contact", contactId],
    queryFn: async () => {
      if (!contactId || !currentWorkspace?.id) return null;
      
      const { data, error } = await supabase
        .from("sj_profiles")
        .select("id, full_name, lifecycle_stage")
        .eq("contact_id", contactId)
        .eq("workspace_id", currentWorkspace.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!contactId && !!currentWorkspace?.id,
  });
}
```

#### 3. Modificar EntitySidebarMenu

Adicionar secção "MÓDULOS" com entrada para Student Journey:

```typescript
// Nova secção no MENU_SECTIONS
{
  title: 'MÓDULOS',
  items: [
    { 
      id: 'student-journey', 
      label: 'Student Journey', 
      icon: GraduationCap, 
      showFor: ['contact'] 
    },
  ],
}
```

**Lógica de visibilidade:**
```typescript
// isVisible function
if (sectionId === 'student-journey') {
  return isModuleInstalled('student-journey') || !!sjProfile;
}
```

#### 4. Adicionar Case no renderSectionContent

Em `ENIContactDetailWithSidebar.tsx`:

```typescript
case 'student-journey':
  return (
    <ContactStudentJourneySection 
      contactId={id!} 
      contactName={contact.name}
    />
  );
```

#### 5. Criar Componente de Secção

**Ficheiro:** `src/components/contacts/sections/ContactStudentJourneySection.tsx`

Funcionalidades:
- Se tem perfil: mostrar resumo + link para abrir perfil completo
- Se não tem: botão para criar perfil vinculado

```text
┌────────────────────────────────────────────────────┐
│ 🎓 Student Journey                                 │
├────────────────────────────────────────────────────┤
│                                                    │
│  ┌──────────────────────────────────────────────┐  │
│  │ Perfil: Ana Carolina Oliveira Costa         │  │
│  │ Etapa: Aluno Ativo 🟢                       │  │
│  │ Score: 75                                    │  │
│  │                                              │  │
│  │ [Ver Perfil Completo]  [Gerir Inscrições]   │  │
│  └──────────────────────────────────────────────┘  │
│                                                    │
│  Inscrições Recentes:                              │
│  • Curso A - 85% concluído                         │
│  • Curso B - Inscrito                              │
│                                                    │
└────────────────────────────────────────────────────┘
```

## Ficheiros a Criar/Modificar

| Ficheiro | Ação |
|----------|------|
| `src/types/entity.ts` | Adicionar 'student-journey' ao MenuSection |
| `src/hooks/useContactStudentJourneyProfile.ts` | **Criar** - Hook para buscar perfil SJ do contacto |
| `src/components/entity/EntitySidebarMenu.tsx` | Adicionar secção MÓDULOS + lógica de visibilidade |
| `src/components/contacts/sections/ContactStudentJourneySection.tsx` | **Criar** - Secção do Student Journey |
| `src/components/contacts/eni/ENIContactDetailWithSidebar.tsx` | Adicionar case 'student-journey' e imports |

## Fluxo de Utilizador

```text
Contacto tem perfil SJ?
        │
   ┌────┴────┐
   │         │
  SIM       NÃO
   │         │
   ▼         ▼
Mostra:   Mostra:
- Resumo  - Botão "Criar
- Link      Perfil SJ"
  para      (pré-preenchido
  perfil    com dados do
            contacto)
```

## Resultado Esperado

1. No menu lateral do contacto, aparece secção "MÓDULOS" com "Student Journey"
2. Clicando, mostra resumo do perfil educacional do contacto
3. Link directo para página de detalhe do perfil em `/dashboard/student-journey/profiles/:profileId`
4. Se não tem perfil, permite criar um novo vinculado ao contacto
