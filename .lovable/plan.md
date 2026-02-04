

# Plano: Multi-Selecção e Ordenação na Lista de Perfis

## Funcionalidades a Implementar

### 1. Multi-Selecção de Perfis
Permitir seleccionar vários perfis em simultâneo para executar acções em massa como apagar.

### 2. Ordenação por Colunas
Permitir ordenar a tabela por nome, estado, score, cursos, etc.

## Alterações Técnicas

### Ficheiro: `src/pages/student-journey/SJProfiles.tsx`

#### A. Estado para Multi-Selecção

Adicionar estado para gerir os perfis seleccionados:

```typescript
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

// Helpers
const toggleSelect = (id: string) => {
  setSelectedIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
};

const toggleSelectAll = () => {
  if (selectedIds.size === filteredProfiles.length) {
    setSelectedIds(new Set());
  } else {
    setSelectedIds(new Set(filteredProfiles.map(p => p.id)));
  }
};

const clearSelection = () => setSelectedIds(new Set());
```

#### B. Estado para Ordenação

```typescript
type SortField = 'name' | 'state' | 'score' | 'courses' | 'created';
type SortDirection = 'asc' | 'desc';

const [sortField, setSortField] = useState<SortField>('name');
const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

const handleSort = (field: SortField) => {
  if (sortField === field) {
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
  } else {
    setSortField(field);
    setSortDirection('asc');
  }
};
```

#### C. Lógica de Ordenação

```typescript
const sortedProfiles = useMemo(() => {
  return [...filteredProfiles].sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case 'name':
        comparison = a.full_name.localeCompare(b.full_name);
        break;
      case 'state':
        comparison = a.lifecycle_stage.localeCompare(b.lifecycle_stage);
        break;
      case 'score':
        comparison = (a.activationScore || 0) - (b.activationScore || 0);
        break;
      case 'courses':
        comparison = (a.completedCourses || 0) - (b.completedCourses || 0);
        break;
      case 'created':
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        break;
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  });
}, [filteredProfiles, sortField, sortDirection]);
```

#### D. Acção de Apagar em Massa

```typescript
const handleBulkDelete = async () => {
  if (selectedIds.size === 0) return;
  
  const confirmed = confirm(
    `Tem a certeza que deseja remover ${selectedIds.size} perfil(is)?`
  );
  
  if (confirmed) {
    for (const id of selectedIds) {
      await deleteProfile.mutateAsync(id);
    }
    clearSelection();
  }
};
```

#### E. Interface - Barra de Acções em Massa

Quando há perfis seleccionados, mostrar uma barra de acções:

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

#### F. Interface - Cabeçalhos Ordenáveis

```typescript
<TableHeader>
  <TableRow>
    <TableHead className="w-12">
      <Checkbox
        checked={selectedIds.size === filteredProfiles.length && filteredProfiles.length > 0}
        onCheckedChange={toggleSelectAll}
      />
    </TableHead>
    <TableHead 
      className="cursor-pointer hover:bg-muted/50"
      onClick={() => handleSort('name')}
    >
      <div className="flex items-center gap-1">
        Nome
        {sortField === 'name' && (
          sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
        )}
      </div>
    </TableHead>
    <TableHead 
      className="cursor-pointer hover:bg-muted/50"
      onClick={() => handleSort('state')}
    >
      <div className="flex items-center gap-1">
        Estado
        {sortField === 'state' && (...)}
      </div>
    </TableHead>
    {/* Repetir para Score, Cursos, etc. */}
  </TableRow>
</TableHeader>
```

#### G. Interface - Checkbox por Linha

```typescript
<TableRow key={profile.id} className={cn(selectedIds.has(profile.id) && "bg-primary/5")}>
  <TableCell>
    <Checkbox
      checked={selectedIds.has(profile.id)}
      onCheckedChange={() => toggleSelect(profile.id)}
    />
  </TableCell>
  {/* ... resto das células */}
</TableRow>
```

## Layout Visual

```text
╔══════════════════════════════════════════════════════════════════════════╗
║ Perfis de Alunos                                    [Importar] [+ Novo]  ║
║ 45 de 120 perfis                                                         ║
╠══════════════════════════════════════════════════════════════════════════╣
║ [Pesquisar...]                      [Potencial ▾] [Tempo ▾] [Área ▾]     ║
║ [Todos] [Lead] [Prospect] [Inscrito] [Ativo] [Concluído] [Inativo]       ║
╠══════════════════════════════════════════════════════════════════════════╣
║  ┌─────────────────────────────────────────────────────────────────────┐ ║
║  │ ✓ 3 perfil(is) seleccionado(s)           [Cancelar] [🗑️ Apagar]    │ ║
║  └─────────────────────────────────────────────────────────────────────┘ ║
╠══════════════════════════════════════════════════════════════════════════╣
║ ☐ │ Nome ↑          │ Estado    │ Score │ Cursos │ Especialidade │ ...  ║
╠══════════════════════════════════════════════════════════════════════════╣
║ ☐ │ Ana Silva       │ Ativo     │  85%  │   3    │ Tricologia    │ ...  ║
║ ☑ │ João Santos     │ Lead      │  45%  │   0    │ -             │ ...  ║
║ ☑ │ Maria Costa     │ Prospect  │  60%  │   1    │ Unhas         │ ...  ║
║ ☑ │ Pedro Almeida   │ Inativo   │  20%  │   2    │ Massagem      │ ...  ║
╚══════════════════════════════════════════════════════════════════════════╝
```

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/pages/student-journey/SJProfiles.tsx` | Adicionar multi-selecção, ordenação e barra de acções em massa |

## Imports Adicionais

```typescript
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
```

## Comportamento Esperado

1. **Selecção Individual**: Clicar no checkbox de uma linha selecciona/desselecciona esse perfil
2. **Selecção Total**: Clicar no checkbox do cabeçalho selecciona/desselecciona todos os perfis visíveis
3. **Barra de Acções**: Aparece automaticamente quando há 1+ perfis seleccionados
4. **Apagar em Massa**: Remove todos os perfis seleccionados após confirmação
5. **Ordenação**: Clicar no cabeçalho de uma coluna ordena por essa coluna (toggle asc/desc)
6. **Indicador Visual**: Seta ↑/↓ mostra a direcção da ordenação actual

