

# Plano: Mostrar Formações Disponíveis no Student Journey do Contacto

## Objetivo

Adicionar uma secção que mostre as formações/cursos disponíveis que o aluno ainda não está inscrito, permitindo uma visão completa da oferta formativa.

## Situação Actual

- Existem 5 cursos disponíveis: Aromaterapia, Avançada, Básica, Iniciação, Tricologia
- A Karen ainda não tem inscrições em nenhum curso
- O componente actual só mostra cursos onde já existe inscrição

## Alterações Necessárias

### 1. Modificar `ContactStudentJourneySection.tsx`

Adicionar:
- Query para buscar todos os cursos disponíveis usando `useCourses()`
- Filtrar cursos que o aluno ainda não está inscrito
- Nova secção visual "Formações Disponíveis" com design distinto

### Estrutura Visual Proposta

```text
┌──────────────────────────────────────────────────┐
│ 📚 Formações Disponíveis                         │
├──────────────────────────────────────────────────┤
│                                                  │
│  ┌────────────────────┐  ┌────────────────────┐  │
│  │ 📖 Iniciação       │  │ 📖 Básica          │  │
│  │ Presencial         │  │ Presencial         │  │
│  │ [+ Inscrever]      │  │ [+ Inscrever]      │  │
│  └────────────────────┘  └────────────────────┘  │
│                                                  │
│  ┌────────────────────┐  ┌────────────────────┐  │
│  │ 📖 Avançada        │  │ 📖 Aromaterapia    │  │
│  │ Presencial         │  │ Presencial         │  │
│  │ [+ Inscrever]      │  │ [+ Inscrever]      │  │
│  └────────────────────┘  └────────────────────┘  │
│                                                  │
│           Ver Todos os Cursos →                  │
└──────────────────────────────────────────────────┘
```

## Alterações Técnicas

### Ficheiro: `src/components/contacts/sections/ContactStudentJourneySection.tsx`

```typescript
// Imports adicionais
import { useCourses } from "@/hooks/useStudentJourney";
import { Plus, Library } from "lucide-react";

// Dentro do componente:
const { courses = [] } = useCourses();

// Filtrar cursos disponíveis (activos e não inscritos)
const enrolledCourseIds = enrollments.map((e: any) => e.course_id);
const availableCourses = courses.filter(
  (course) => course.is_active && !enrolledCourseIds.includes(course.id)
);

// Nova secção após Jornada do Aluno:
{availableCourses.length > 0 && (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Library className="w-4 h-4 text-violet-500" />
        Formações Disponíveis
      </CardTitle>
      <CardDescription>
        Cursos onde o aluno ainda não está inscrito
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-2 gap-2">
        {availableCourses.slice(0, 4).map((course) => (
          <div key={course.id} className="p-3 border rounded-lg">
            <span className="font-medium text-sm">{course.name}</span>
            <span className="text-xs text-muted-foreground block">
              {course.course_type}
            </span>
            <Button size="sm" variant="outline" className="mt-2 w-full">
              <Plus className="w-3 h-3 mr-1" />
              Inscrever
            </Button>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
)}
```

## Funcionalidades

1. **Mostrar cursos disponíveis** - Lista de cursos activos onde o aluno não está inscrito
2. **Tipo de curso** - Indicação se é presencial, online, etc.
3. **Botão de inscrição rápida** - Permite inscrever directamente (futuramente pode abrir modal)
4. **Link para catálogo** - Ver todos os cursos disponíveis

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/contacts/sections/ContactStudentJourneySection.tsx` | Adicionar secção de formações disponíveis |

## Resultado Esperado

1. Após a "Jornada do Aluno", aparece secção "Formações Disponíveis"
2. Mostra até 4 cursos em grid 2x2
3. Cada curso mostra nome, tipo e botão para inscrever
4. Se há mais de 4 cursos, mostra link para ver todos

