
# Plano: Cruzar Formações na Importação de Perfis

## Contexto

Atualmente, a importação de perfis do Excel apenas guarda o campo `primary_interest` como texto livre (ex: "Desenvolvimento Web"). Este valor não está ligado aos cursos existentes no sistema, perdendo a oportunidade de criar inscrições automáticas.

## Funcionalidade Proposta

Ao importar perfis, o sistema deve:
1. Detectar colunas que indicam formações (ex: "Curso", "Formação", "Interesse")
2. Cruzar os valores com os cursos existentes no workspace
3. Mostrar no preview quais cursos foram identificados
4. Criar automaticamente inscrições com status "interested" para cada match

## Fluxo de Utilizador Melhorado

```text
1. Upload do Excel
   ↓
2. Detecção de headers (já implementado)
   ↓
3. NOVO: Matching de cursos
   - Compara "Curso Básico" → encontra "Formação Básica"
   - Usa matching flexível (normalização, palavras-chave)
   ↓
4. Preview com nova coluna "Formação Identificada"
   ↓
5. Importação cria:
   - Perfil (sj_profiles)
   - Inscrição automática (sj_enrollments) ← NOVO
```

## Alterações Técnicas

### 1. Adicionar Dados de Curso ao Matching

Antes do preview, buscar todos os cursos activos do workspace para matching:

```typescript
// Buscar cursos para matching
const { data: courses } = await supabase
  .from("sj_courses")
  .select("id, name, tags")
  .eq("workspace_id", currentWorkspace.id)
  .eq("is_active", true);
```

### 2. Função de Matching de Cursos

Criar lógica de matching flexível que considera:
- Nome exacto (normalizado)
- Nome parcial (contém palavras-chave)
- Tags do curso

```typescript
const normalizeName = (name: string): string => {
  return name.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, " ")
    .trim();
};

const findMatchingCourse = (interest: string, courses: SJCourse[]): SJCourse | null => {
  if (!interest) return null;
  const normalizedInterest = normalizeName(interest);
  const interestWords = normalizedInterest.split(/\s+/).filter(w => w.length > 2);
  
  // 1. Match exacto
  const exactMatch = courses.find(c => 
    normalizeName(c.name) === normalizedInterest
  );
  if (exactMatch) return exactMatch;
  
  // 2. Match parcial (nome contém interesse ou vice-versa)
  const partialMatch = courses.find(c => {
    const courseName = normalizeName(c.name);
    return courseName.includes(normalizedInterest) || 
           normalizedInterest.includes(courseName);
  });
  if (partialMatch) return partialMatch;
  
  // 3. Match por palavras-chave
  const keywordMatch = courses.find(c => {
    const courseName = normalizeName(c.name);
    const courseWords = courseName.split(/\s+/);
    // Se 50% ou mais das palavras coincidirem
    const matches = interestWords.filter(w => courseWords.some(cw => cw.includes(w)));
    return matches.length >= Math.ceil(interestWords.length * 0.5);
  });
  if (keywordMatch) return keywordMatch;
  
  // 4. Match por tags
  const tagMatch = courses.find(c => 
    c.tags?.some(tag => normalizeName(tag).includes(normalizedInterest))
  );
  return tagMatch || null;
};
```

### 3. Actualizar Interface ParsedProfile

Adicionar campos para guardar o curso identificado:

```typescript
interface ParsedProfile {
  // ... campos existentes ...
  // Novos campos para matching de cursos
  matchedCourseId?: string;
  matchedCourseName?: string;
  courseMatchType?: "exact" | "partial" | "keyword" | "tag";
}
```

### 4. Actualizar Preview com Coluna de Formação

Adicionar coluna na tabela de preview:

```typescript
<th className="p-2 text-left">Formação</th>
// ...
<td className="p-2">
  {profile.matchedCourseId ? (
    <Badge variant="outline" className="gap-1 text-xs bg-purple-50 text-purple-700 border-purple-200">
      <GraduationCap className="h-3 w-3" />
      {profile.matchedCourseName}
    </Badge>
  ) : profile.primary_interest ? (
    <span className="text-muted-foreground text-xs">{profile.primary_interest}</span>
  ) : (
    <span className="text-muted-foreground text-xs">—</span>
  )}
</td>
```

### 5. Criar Inscrições na Importação

Após criar o perfil, criar automaticamente a inscrição:

```typescript
// Dentro de handleImport
const { data: createdProfile, error } = await supabase
  .from("sj_profiles")
  .insert({ /* ... */ })
  .select()
  .single();

if (!error && createdProfile && profile.matchedCourseId) {
  // Criar inscrição automática
  await supabase.from("sj_enrollments").insert({
    workspace_id: currentWorkspace.id,
    profile_id: createdProfile.id,
    course_id: profile.matchedCourseId,
    status: "interested",
    payment_status: "unpaid",
    source: "import",
  });
  result.enrollmentsCreated++;
}
```

### 6. Actualizar Estatísticas Finais

Mostrar quantas inscrições foram criadas:

```typescript
interface ImportResult {
  created: number;
  matched: number;
  enrollmentsCreated: number; // NOVO
  errors: string[];
}

// No ecrã de conclusão
<div className="bg-muted/50 rounded-lg p-4 text-center">
  <p className="text-2xl font-bold text-purple-600">
    {importResult.enrollmentsCreated}
  </p>
  <p className="text-sm text-muted-foreground">
    Inscrições criadas
  </p>
</div>
```

### 7. Actualizar Template de Exemplo

Actualizar o template descarregável com exemplos claros de formações:

```typescript
const template = [
  {
    nome: "João Silva",
    email: "joao@exemplo.pt",
    telefone: "912345678",
    formacao: "Curso Básico",  // Nome de um curso existente
    origem: "Website",
    notas: "Interessado na formação básica",
  },
];
```

## Exemplos de Matching

| Excel (Interesse) | Curso no Sistema | Match | Tipo |
|-------------------|------------------|-------|------|
| "Curso Básico" | "Curso Básico de Terapia" | ✓ | parcial |
| "Formação Avançada" | "Formação Avançada" | ✓ | exacto |
| "Basico" | "Curso Básico" | ✓ | keyword |
| "Reiki" | Curso com tag "reiki" | ✓ | tag |
| "Yoga para crianças" | Nenhum | ✗ | — |

## Ficheiros a Modificar

| Ficheiro | Alterações |
|----------|------------|
| `src/components/student-journey/ImportProfilesDialog.tsx` | Matching de cursos, nova coluna preview, criação de inscrições |

## Resultado Esperado

1. Formações no Excel são automaticamente ligadas a cursos existentes
2. Preview mostra visualmente quais formações foram identificadas
3. Inscrições com status "interested" são criadas automaticamente
4. Estatísticas finais mostram perfis criados + inscrições criadas
5. Utilizador economiza tempo ao não ter que criar inscrições manualmente
