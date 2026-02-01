
# Plano: Suportar Múltiplas Colunas de Cursos na Importação

## Problema Identificado

O ficheiro Excel pode ter **múltiplas colunas** que indicam cursos/formações (ex: "Curso 1", "Curso 2", "Formação Inicial", "Formação Avançada"), mas o sistema actual:

1. Apenas captura uma coluna para `primary_interest`
2. Ignora outras colunas que podem conter nomes de cursos
3. Só cria uma inscrição por perfil (apenas para o primeiro curso encontrado)

## Solução Proposta

Detectar automaticamente **todas as colunas** que contêm nomes de cursos válidos e criar inscrições para cada uma.

## Alterações Técnicas

### 1. Detectar Todas as Colunas de Cursos

Antes de mapear perfis, identificar quais colunas do Excel contêm valores que correspondem a cursos:

```typescript
// Detectar colunas que são potencialmente cursos
const detectCourseColumns = (
  headers: string[], 
  sampleRows: Record<string, string>[], 
  coursesList: SJCourse[]
): string[] => {
  const courseColumns: string[] = [];
  
  for (const header of headers) {
    // Verificar se alguma linha desta coluna faz match com um curso
    const hasMatch = sampleRows.some(row => {
      const value = row[header];
      if (!value) return false;
      return findMatchingCourse(value, coursesList) !== null;
    });
    
    if (hasMatch) {
      courseColumns.push(header);
    }
  }
  
  return courseColumns;
};
```

### 2. Actualizar Interface ParsedProfile

Suportar múltiplos cursos por perfil:

```typescript
interface MatchedCourse {
  courseId: string;
  courseName: string;
  matchType: "exact" | "partial" | "keyword" | "tag";
  sourceColumn: string;  // Nome da coluna de onde veio
}

interface ParsedProfile {
  // ... campos existentes ...
  matchedCourses: MatchedCourse[];  // NOVO: array de cursos
}
```

### 3. Melhorar mapToProfiles

Percorrer todas as colunas e extrair cursos:

```typescript
const mapToProfiles = (
  data: Record<string, string>[], 
  courseColumns: string[],
  coursesList: SJCourse[]
): ParsedProfile[] => {
  return data.map((row) => {
    const normalizedRow = normalizeAllKeys(row);
    
    // Extrair todos os cursos de todas as colunas identificadas
    const matchedCourses: MatchedCourse[] = [];
    for (const col of courseColumns) {
      const value = normalizedRow[col];
      if (!value) continue;
      
      const match = findMatchingCourse(value, coursesList);
      if (match) {
        // Evitar duplicados
        if (!matchedCourses.some(mc => mc.courseId === match.course.id)) {
          matchedCourses.push({
            courseId: match.course.id,
            courseName: match.course.name,
            matchType: match.matchType,
            sourceColumn: col,
          });
        }
      }
    }
    
    return {
      full_name: getName(normalizedRow),
      email: getEmail(normalizedRow),
      // ...
      matchedCourses,
    };
  });
};
```

### 4. Actualizar Preview para Mostrar Múltiplos Cursos

```typescript
<td className="p-2">
  {profile.matchedCourses.length > 0 ? (
    <div className="flex flex-wrap gap-1">
      {profile.matchedCourses.map((mc, i) => (
        <Badge
          key={i}
          variant="outline"
          className="gap-1 text-xs bg-purple-50 text-purple-700 border-purple-200"
        >
          <GraduationCap className="h-3 w-3" />
          {mc.courseName}
        </Badge>
      ))}
    </div>
  ) : (
    <span className="text-muted-foreground text-xs">—</span>
  )}
</td>
```

### 5. Criar Múltiplas Inscrições na Importação

```typescript
// Dentro de handleImport
for (const matchedCourse of profile.matchedCourses) {
  const { error: enrollError } = await supabase.from("sj_enrollments").insert({
    workspace_id: currentWorkspace.id,
    profile_id: createdProfile.id,
    course_id: matchedCourse.courseId,
    status: "interested",
    payment_status: "unpaid",
    source: "import",
  });

  if (!enrollError) {
    result.enrollmentsCreated++;
  }
}
```

### 6. Adicionar Colunas Específicas de Curso ao Header Detection

Expandir a lista de keywords para detectar colunas de cursos:

```typescript
const COURSE_COLUMN_PATTERNS = [
  "curso", "formacao", "formação", 
  "course", "training",
  "modulo", "módulo",
  "nivel", "nível",
  "workshop"
];

// Verificar se o nome da coluna indica um curso
const isCourseColumn = (header: string): boolean => {
  const normalized = normalizeHeader(header);
  return COURSE_COLUMN_PATTERNS.some(p => normalized.includes(p));
};
```

## Fluxo Melhorado

```text
1. Upload do Excel
   ↓
2. Detectar headers (existente)
   ↓
3. NOVO: Identificar TODAS as colunas que contêm cursos
   - Por nome da coluna (contém "curso", "formação", etc.)
   - Por conteúdo (valores fazem match com cursos existentes)
   ↓
4. Mapear perfis com array de cursos
   ↓
5. Preview mostra todos os cursos por perfil
   ↓
6. Importação cria:
   - 1 Perfil
   - N Inscrições (uma por curso encontrado)
```

## Exemplo Prático

**Ficheiro Excel:**
| Nome | Curso Principal | Outra Formação | Workshop |
|------|-----------------|----------------|----------|
| João Silva | Básica | Avançada | Aromaterapia |
| Maria Santos | Iniciação | | Tricologia |

**Resultado:**
- João Silva → 3 inscrições (Básica, Avançada, Aromaterapia)
- Maria Santos → 2 inscrições (Iniciação, Tricologia)

## Ficheiro a Modificar

| Ficheiro | Alterações |
|----------|------------|
| `src/components/student-journey/ImportProfilesDialog.tsx` | Detecção de múltiplas colunas, array de cursos, múltiplas inscrições |

## Resultado Esperado

1. Todas as colunas do Excel que contêm cursos são detectadas
2. Preview mostra múltiplos badges por perfil quando há vários cursos
3. Uma inscrição é criada para cada curso identificado
4. Estatísticas finais reflectem o total de inscrições (pode ser > perfis)
5. Nenhuma formação é perdida na importação
