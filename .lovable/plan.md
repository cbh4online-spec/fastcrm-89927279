

# Plano: Adicionar Multi-Selecção e Ordenação ao SJProfiles.tsx

## Problema Identificado

As funcionalidades de multi-selecção e ordenação foram implementadas no ficheiro errado:
- **SJProfiles.tsx** - usado na rota `/dashboard/student-journey/profiles` (ficheiro actual, SEM as funcionalidades)
- **SJStudents.tsx** - ficheiro onde as alterações foram feitas (rota diferente)

## Solução

Adicionar as mesmas funcionalidades ao ficheiro correcto `SJProfiles.tsx`, adaptando para as colunas existentes (Nome, Estado, Score, Cursos, Especialidade, Follow-up).

## Alterações Técnicas

### Ficheiro: `src/pages/student-journey/SJProfiles.tsx`

#### 1. Imports Adicionais

```typescript
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
```

#### 2. Estados para Selecção e Ordenação

```typescript
type SortField = 'name' | 'stage' | 'score' | 'courses' | 'specialty' | 'followup';
type SortDirection = 'asc' | 'desc';

// Multi-selection
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

// Sorting
const [sortField, setSortField] = useState<SortField>('name');
const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
```

#### 3. Helpers de Selecção

```typescript
const toggleSelect = (id: string) => {
  setSelectedIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
};

const toggleSelectAll = () => {
  if (selectedIds.size === sortedProfiles.length) {
    setSelectedIds(new Set());
  } else {
    setSelectedIds(new Set(sortedProfiles.map(p => p.id)));
  }
};

const clearSelection = () => setSelectedIds(new Set());
```

#### 4. Lógica de Ordenação

```typescript
const sortedProfiles = useMemo(() => {
  return [...filteredProfiles].sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case 'name':
        comparison = a.full_name.localeCompare(b.full_name);
        break;
      case 'stage':
        comparison = a.lifecycle_stage.localeCompare(b.lifecycle_stage);
        break;
      case 'score':
        comparison = (a.activationScore || 0) - (b.activationScore || 0);
        break;
      case 'courses':
        comparison = (a.completedCourses || 0) - (b.completedCourses || 0);
        break;
      case 'specialty':
        comparison = (a.primary_specialty || '').localeCompare(b.primary_specialty || '');
        break;
      case 'followup':
        const dateA = a.next_follow_up_at ? new Date(a.next_follow_up_at).getTime() : 0;
        const dateB = b.next_follow_up_at ? new Date(b.next_follow_up_at).getTime() : 0;
        comparison = dateA - dateB;
        break;
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  });
}, [filteredProfiles, sortField, sortDirection]);
```

#### 5. Handler de Ordenação

```typescript
const handleSort = (field: SortField) => {
  if (sortField === field) {
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
  } else {
    setSortField(field);
    setSortDirection('asc');
  }
};
```

#### 6. Componente SortIcon

```typescript
const SortIcon = ({ field }: { field: SortField }) => {
  if (sortField !== field) {
    return <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />;
  }
  return sortDirection === 'asc' 
    ? <ArrowUp className="h-3 w-3" /> 
    : <ArrowDown className="h-3 w-3" />;
};
```

#### 7. Barra de Acções em Massa (após os filtros, antes da Card)

```typescript
{selectedIds.size > 0 && (
  <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg border border-primary/20">
    <span className="text-sm font-medium">
      {selectedIds.size} perfil(is) seleccionado(s)
    </span>
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm" onClick={clearSelection}>
        Cancelar
      </Button>
      <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
        <Trash2 className="h-4 w-4 mr-2" />
        Apagar Seleccionados
      </Button>
    </div>
  </div>
)}
```

#### 8. Cabeçalhos de Tabela com Ordenação

Substituir os TableHead actuais por versões clicáveis:

```typescript
<TableHeader>
  <TableRow>
    <TableHead className="w-12">
      <Checkbox
        checked={selectedIds.size === sortedProfiles.length && sortedProfiles.length > 0}
        onCheckedChange={toggleSelectAll}
        aria-label="Seleccionar todos"
      />
    </TableHead>
    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('name')}>
      <div className="flex items-center gap-1">
        Nome
        <SortIcon field="name" />
      </div>
    </TableHead>
    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('stage')}>
      <div className="flex items-center gap-1">
        Estado
        <SortIcon field="stage" />
      </div>
    </TableHead>
    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('score')}>
      <div className="flex items-center gap-1">
        Score
        <SortIcon field="score" />
      </div>
    </TableHead>
    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('courses')}>
      <div className="flex items-center gap-1">
        Cursos
        <SortIcon field="courses" />
      </div>
    </TableHead>
    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('specialty')}>
      <div className="flex items-center gap-1">
        Especialidade
        <SortIcon field="specialty" />
      </div>
    </TableHead>
    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('followup')}>
      <div className="flex items-center gap-1">
        Follow-up
        <SortIcon field="followup" />
      </div>
    </TableHead>
    <TableHead className="w-12"></TableHead>
  </TableRow>
</TableHeader>
```

#### 9. Checkbox em Cada Linha

Adicionar checkbox e highlight visual nas linhas:

```typescript
<TableRow key={profile.id} className={cn(selectedIds.has(profile.id) && "bg-primary/5")}>
  <TableCell>
    <Checkbox
      checked={selectedIds.has(profile.id)}
      onCheckedChange={() => toggleSelect(profile.id)}
      aria-label={`Seleccionar ${profile.full_name}`}
    />
  </TableCell>
  {/* resto das células... */}
</TableRow>
```

#### 10. Usar sortedProfiles em vez de filteredProfiles no map

Alterar a iteração para usar os perfis ordenados.

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/pages/student-journey/SJProfiles.tsx` | Adicionar multi-selecção, ordenação por colunas e barra de acções em massa |

## Resultado Esperado

1. Checkbox visível em cada linha para selecção individual
2. Checkbox no cabeçalho para seleccionar/desseleccionar todos
3. Barra de acções aparece quando há perfis seleccionados
4. Clicar nos cabeçalhos ordena por essa coluna (alternando asc/desc)
5. Ícones de seta indicam a direcção da ordenação actual

