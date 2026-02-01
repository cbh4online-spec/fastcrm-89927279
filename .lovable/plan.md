
# Plano: Corrigir Detecção de Cabeçalhos no BulkEnrollmentDialog

## Problema Identificado

O ficheiro Excel tem uma estrutura com **duas linhas de cabeçalho**:

| Linha | Conteúdo |
|-------|----------|
| **1** | Cabeçalhos de grupo: vazio, "C/Formação", "Dados \| Valores Anuais..." |
| **2** | Cabeçalhos reais: "Nome", "S/Formação", "Iniciação", "Básica", etc. |
| **3+** | Dados dos clientes |

O código actual usa `XLSX.utils.sheet_to_json()` que assume a primeira linha como cabeçalho, resultando em:
- Cabeçalhos incorrectos (linha 1 em vez de linha 2)
- Coluna "Nome" não encontrada porque na linha 1 está vazia

## Solução

Implementar detecção automática da linha de cabeçalhos, semelhante ao que já existe no `ImportProfilesDialog.tsx`:

1. **Procurar nas primeiras 10 linhas** por campos esperados
2. **Identificar a linha com "Nome"** como a linha de cabeçalhos
3. **Usar essa linha como referência** para o mapeamento de colunas

## Alterações Técnicas

### Adicionar Função `findHeaderRow`

```typescript
// Keywords esperadas nos cabeçalhos
const EXPECTED_HEADER_FIELDS = ["nome", "iniciacao", "basica", "avancada", "tricologia", "aromaterapia"];

// Procurar a linha de cabeçalhos nas primeiras 10 linhas
const findHeaderRow = (sheet: XLSX.WorkSheet): number => {
  const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");
  const maxScanRows = Math.min(10, range.e.r + 1);

  for (let row = 0; row < maxScanRows; row++) {
    let matchCount = 0;
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddr = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = sheet[cellAddr];
      if (cell && cell.v) {
        const normalized = normalizeColumnName(String(cell.v));
        if (EXPECTED_HEADER_FIELDS.some((f) => normalized.includes(f))) {
          matchCount++;
        }
      }
    }
    // Se encontrar pelo menos 2 campos esperados, é a linha de cabeçalhos
    if (matchCount >= 2) {
      return row;
    }
  }
  return 0; // Default: primeira linha
};
```

### Modificar Leitura do Excel

```typescript
const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
  // ...
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  
  // Detectar linha de cabeçalhos
  const headerRow = findHeaderRow(sheet);
  
  // Converter para JSON começando na linha correcta
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { 
    defval: "",
    range: headerRow  // <-- NOVO: começar na linha de cabeçalhos
  });
  // ...
};
```

### Melhorar Detecção da Coluna Nome

Usar matching mais robusto com múltiplas variações:

```typescript
const NAME_COLUMN_PATTERNS = ["nome", "name", "cliente", "client", "razao social", "razao_social"];

const findNameColumn = (headers: string[]): string | null => {
  const normalizedHeaders = headers.map((h) => ({
    original: h,
    normalized: normalizeColumnName(h)
  }));
  
  // Tentar match exacto primeiro
  for (const pattern of NAME_COLUMN_PATTERNS) {
    const match = normalizedHeaders.find((h) => h.normalized === pattern);
    if (match) return match.original;
  }
  
  // Tentar match parcial (contém)
  for (const pattern of NAME_COLUMN_PATTERNS) {
    const match = normalizedHeaders.find((h) => h.normalized.includes(pattern));
    if (match) return match.original;
  }
  
  return null;
};
```

## Ficheiro a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/student-journey/BulkEnrollmentDialog.tsx` | Adicionar detecção automática de linha de cabeçalhos e matching robusto da coluna Nome |

## Resultado Esperado

1. Sistema detecta que a linha 2 (índice 1) contém os cabeçalhos
2. Coluna "Nome" é encontrada correctamente
3. Colunas de formação são detectadas
4. Importação processa os dados a partir da linha 3 (índice 2)
