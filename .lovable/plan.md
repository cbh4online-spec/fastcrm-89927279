
# Plano: Substituir Progresso por Data do Curso na Jornada

## Problema Identificado

Na tab "Jornada", os cursos presenciais mostram "0%" de progresso, o que não faz sentido. Para formações presenciais, o que interessa saber é **quando o curso acontece** (data de início/fim).

## Solução Proposta

Substituir a barra de progresso por informação contextual baseada no tipo de curso:
- **Cursos presenciais**: Mostrar data do curso (se disponível) ou data de inscrição
- **Cursos online**: Mantém progresso % (se aplicável)

## Alteração Visual

```text
ANTES (confuso):
┌─────────────────────────────────────────────────────────┐
│ → Avançada           [███░░░░░░░] 0%      Em Progresso │
│ → Básica             [███░░░░░░░] 0%      Em Progresso │
└─────────────────────────────────────────────────────────┘

DEPOIS (mais útil):
┌─────────────────────────────────────────────────────────┐
│ → Avançada           Início: 15 Mar 2026   Em Progresso │
│ → Básica             Início: 22 Mar 2026   Em Progresso │
└─────────────────────────────────────────────────────────┘

OU (se não há data definida):
┌─────────────────────────────────────────────────────────┐
│ → Avançada           Presencial            Em Progresso │
│ → Básica             Presencial            Em Progresso │
└─────────────────────────────────────────────────────────┘
```

## Alterações Técnicas

### Ficheiro: `src/components/contacts/sections/ContactStudentJourneySection.tsx`

1. Remover a barra de progresso para todos os cursos
2. Mostrar informação contextual:
   - Se curso tem `start_date`: mostrar "Início: {data formatada}"
   - Se curso tem `end_date` e `start_date`: mostrar período
   - Se não tem datas: mostrar tipo do curso (Presencial/Online)
   - Para cursos concluídos: mostrar data de conclusão se disponível

### Lógica de Exibição

```typescript
// Determinar o que mostrar em vez do progresso
const getEnrollmentInfo = (enrollment: any) => {
  const course = enrollment.course;
  
  // Se concluído, mostrar data de conclusão
  if (enrollment.status === 'completed' && enrollment.completed_at) {
    return `Concluído: ${format(new Date(enrollment.completed_at), 'dd MMM yyyy', { locale: pt })}`;
  }
  
  // Se tem data de início do curso
  if (course?.start_date) {
    return `Início: ${format(new Date(course.start_date), 'dd MMM yyyy', { locale: pt })}`;
  }
  
  // Se tem data de início da inscrição
  if (enrollment.started_at) {
    return `Desde: ${format(new Date(enrollment.started_at), 'dd MMM yyyy', { locale: pt })}`;
  }
  
  // Fallback: tipo do curso
  return course?.course_type === 'presencial' ? 'Presencial' 
       : course?.course_type === 'online' ? 'Online' 
       : 'Híbrido';
};
```

### Novo Layout do Item

```typescript
<div className="flex items-center gap-3">
  <StatusIcon className="w-4 h-4 shrink-0" />
  <div className="flex-1 min-w-0">
    <p className="text-sm font-medium truncate">
      {enrollment.course?.name || "Curso"}
    </p>
    <p className="text-xs text-muted-foreground mt-0.5">
      {getEnrollmentInfo(enrollment)}
    </p>
  </div>
  <Badge variant="secondary">
    {statusInfo.label}
  </Badge>
</div>
```

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/contacts/sections/ContactStudentJourneySection.tsx` | Substituir Progress por data/info contextual |

## Resultado Esperado

1. Cursos mostram informação relevante (data ou tipo) em vez de progresso
2. Layout mais limpo sem barra de progresso desnecessária
3. Informação mais útil para o utilizador perceber quando é o curso
4. Para cursos concluídos, mostra quando foi concluído
