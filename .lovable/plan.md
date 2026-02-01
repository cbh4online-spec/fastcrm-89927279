
# Plano: Adicionar Selecção e Mapeamento de Colunas na Importação

## Problema Identificado

O diálogo de importação actual salta directamente para o preview dos perfis, sem mostrar ao utilizador:
1. Quais colunas foram detectadas no ficheiro Excel
2. Como cada coluna foi mapeada (ou não mapeada)
3. Opção para corrigir/ajustar o mapeamento manualmente

O utilizador quer ver **todas as colunas** do Excel e poder seleccionar quais usar.

## Solução Proposta

Adicionar um **novo passo "Mapeamento de Colunas"** entre o upload e o preview:

```text
Upload → [NOVO] Mapear Colunas → Preview → Importação → Concluído
```

## Interface do Novo Passo

O novo ecrã mostrará uma tabela com:
- Todas as colunas detectadas no Excel
- O campo de destino mapeado automaticamente (ou "Não mapeado")
- Dropdown para alterar o mapeamento
- Checkbox para incluir/excluir a coluna

## Alterações Técnicas

### 1. Adicionar Novo Estado para Colunas Detectadas

```typescript
interface DetectedColumn {
  originalName: string;           // Nome original no Excel
  normalizedName: string;         // Nome normalizado
  mappedTo: string | null;        // Campo de destino (nome, email, etc.)
  isSelected: boolean;            // Incluir na importação
  sampleValues: string[];         // 3 primeiros valores para preview
  isCourseColumn: boolean;        // É coluna de curso/formação
}

// Novos estados
const [detectedColumns, setDetectedColumns] = useState<DetectedColumn[]>([]);
const [rawData, setRawData] = useState<Record<string, string>[]>([]);
```

### 2. Definir Campos de Destino Disponíveis

```typescript
const MAPPING_FIELDS = [
  { value: "nome", label: "Nome", icon: User },
  { value: "email", label: "Email", icon: Mail },
  { value: "telefone", label: "Telefone", icon: Phone },
  { value: "origem", label: "Origem/Fonte", icon: Globe },
  { value: "notas", label: "Notas", icon: FileText },
  { value: "curso", label: "Formação/Curso", icon: GraduationCap },
  { value: "ignorar", label: "Ignorar coluna", icon: XCircle },
];
```

### 3. Actualizar o Fluxo de Passos

```typescript
// Alterar de 4 para 5 passos
const [step, setStep] = useState<
  "upload" | "mapping" | "preview" | "importing" | "complete"
>("upload");
```

### 4. Detectar Colunas ao Carregar Ficheiro

```typescript
const handleFileSelect = async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  // Extrair colunas e dados brutos
  const { columns, data } = await extractColumnsAndData(file);
  
  // Auto-mapear colunas conhecidas
  const mappedColumns = columns.map(col => ({
    originalName: col.original,
    normalizedName: col.normalized,
    mappedTo: autoDetectMapping(col.normalized),
    isSelected: true,
    sampleValues: getSampleValues(data, col.original, 3),
    isCourseColumn: isCourseColumnByName(col.normalized) || 
                    hasCourseMatches(data, col.original),
  }));
  
  setDetectedColumns(mappedColumns);
  setRawData(data);
  setStep("mapping"); // Ir para novo passo
};
```

### 5. Interface do Passo de Mapeamento

```typescript
{step === "mapping" && (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium">
          {detectedColumns.length} colunas detectadas
        </p>
        <p className="text-xs text-muted-foreground">
          Verifique o mapeamento e seleccione as colunas a importar
        </p>
      </div>
    </div>

    <ScrollArea className="h-[350px] border rounded-lg">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 sticky top-0">
          <tr>
            <th className="p-2 w-8">
              <Checkbox /> {/* Seleccionar todas */}
            </th>
            <th className="p-2 text-left">Coluna no Excel</th>
            <th className="p-2 text-left">Exemplos</th>
            <th className="p-2 text-left">Mapear para</th>
          </tr>
        </thead>
        <tbody>
          {detectedColumns.map((col, idx) => (
            <tr key={idx} className="border-t">
              <td className="p-2">
                <Checkbox 
                  checked={col.isSelected}
                  onCheckedChange={(c) => toggleColumn(idx, c)}
                />
              </td>
              <td className="p-2 font-medium">
                {col.originalName}
                {col.isCourseColumn && (
                  <Badge className="ml-2 text-xs">Formação</Badge>
                )}
              </td>
              <td className="p-2 text-xs text-muted-foreground max-w-[150px] truncate">
                {col.sampleValues.join(", ")}
              </td>
              <td className="p-2">
                <Select 
                  value={col.mappedTo || "ignorar"} 
                  onValueChange={(v) => updateMapping(idx, v)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MAPPING_FIELDS.map(field => (
                      <SelectItem key={field.value} value={field.value}>
                        {field.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollArea>

    <DialogFooter>
      <Button variant="outline" onClick={resetDialog}>
        Voltar
      </Button>
      <Button onClick={proceedToPreview}>
        Continuar para Preview
      </Button>
    </DialogFooter>
  </div>
)}
```

### 6. Processar com Mapeamento Manual

Quando o utilizador avança para o preview, usar o mapeamento definido:

```typescript
const proceedToPreview = () => {
  // Usar apenas colunas seleccionadas com o mapeamento definido
  const selectedColumns = detectedColumns.filter(c => c.isSelected);
  
  // Construir profiles usando o mapeamento manual
  const profiles = rawData.map(row => {
    const profile: ParsedProfile = {
      full_name: "",
      matchedCourses: [],
    };
    
    for (const col of selectedColumns) {
      const value = row[col.originalName];
      if (!value) continue;
      
      switch (col.mappedTo) {
        case "nome":
          profile.full_name = value;
          break;
        case "email":
          profile.email = value;
          break;
        case "telefone":
          profile.phone = value;
          break;
        case "curso":
          // Tentar match com cursos existentes
          const match = findMatchingCourse(value, courses);
          if (match) {
            profile.matchedCourses.push({...});
          }
          break;
        // ... outros campos
      }
    }
    
    return profile;
  }).filter(p => p.full_name);
  
  setParsedData(profiles);
  setStep("preview");
};
```

## Fluxo Visual

```text
┌─────────────────────────────────────────────────────────────┐
│  Passo 1: Upload                                            │
│  [Arrastar ficheiro ou clicar para seleccionar]             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  Passo 2: Mapear Colunas (NOVO)                             │
│                                                             │
│  ☑ Nome Completo    → [Nome ▼]      "João, Maria..."       │
│  ☑ E-mail           → [Email ▼]     "joao@..., maria@..."  │
│  ☑ Contacto         → [Telefone ▼]  "912..., 923..."       │
│  ☑ Curso Básico     → [Formação ▼]  "Nível 1, Básico..."   │
│  ☑ Curso Avançado   → [Formação ▼]  "Nível 2, Avançado..." │
│  ☐ Data Registo     → [Ignorar ▼]   "2024-01, 2024-02..."  │
│  ☐ ID Interno       → [Ignorar ▼]   "001, 002, 003..."     │
│                                                             │
│                           [Voltar] [Continuar para Preview] │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  Passo 3: Preview (existente)                               │
│  Mostra perfis processados com mapeamento do utilizador     │
└─────────────────────────────────────────────────────────────┘
```

## Ficheiro a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/student-journey/ImportProfilesDialog.tsx` | Adicionar passo de mapeamento, novos estados, nova UI |

## Resultado Esperado

1. Utilizador vê **todas as colunas** do Excel após upload
2. Sistema mostra **sugestão automática** de mapeamento
3. Utilizador pode **corrigir mapeamentos** incorrectos
4. Utilizador pode **desseleccionar** colunas irrelevantes
5. Preview mostra dados processados com o mapeamento definido
6. Colunas de curso são automaticamente identificadas e marcadas
