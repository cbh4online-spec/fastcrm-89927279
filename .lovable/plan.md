
# Plano: Corrigir Importação de Excel com Detecção Dinâmica de Cabeçalhos

## Problema Identificado

Ao importar ficheiro Excel, o sistema mostra "0 perfis encontrados" porque:

1. O código assume que os headers estão na primeira linha
2. Muitos ficheiros Excel têm linhas vazias ou títulos antes dos dados
3. Não há detecção automática de onde começa a tabela de dados
4. Os nomes das colunas podem ter variações (acentos, maiúsculas, espaços)

## Solução Proposta

Implementar detecção dinâmica de cabeçalhos que:
1. Procura a linha com os headers nas primeiras 10 linhas
2. Normaliza nomes (remove acentos, lowercase, trim)
3. Mapeia colunas de forma flexível
4. Adiciona logging para debug

## Alterações Técnicas

### Ficheiro: `src/components/student-journey/ImportProfilesDialog.tsx`

**1. Adicionar função de normalização de headers**
```typescript
const normalizeHeader = (header: string): string => {
  if (!header) return "";
  return header
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[^a-z0-9]/g, "_");     // Substitui espaços/símbolos por _
};
```

**2. Adicionar detecção dinâmica da linha de cabeçalhos**
```typescript
const EXPECTED_FIELDS = ["nome", "email", "telefone", "interesse", "origem"];

const findHeaderRow = (sheet: XLSX.WorkSheet): number => {
  const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");
  const maxScanRows = Math.min(10, range.e.r + 1);
  
  for (let row = 0; row < maxScanRows; row++) {
    let matchCount = 0;
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddr = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = sheet[cellAddr];
      if (cell && cell.v) {
        const normalized = normalizeHeader(String(cell.v));
        if (EXPECTED_FIELDS.some(f => normalized.includes(f))) {
          matchCount++;
        }
      }
    }
    // Se encontrar pelo menos 2 campos esperados, é provavelmente o header
    if (matchCount >= 2) {
      return row;
    }
  }
  return 0; // Default: primeira linha
};
```

**3. Melhorar parseFile para usar header row detectado**
```typescript
const parseFile = async (file: File): Promise<ParsedProfile[]> => {
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "xlsx" || ext === "xls") {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    
    // Detectar linha de headers
    const headerRow = findHeaderRow(sheet);
    console.log("Header row detected at:", headerRow);
    
    // Converter a partir da linha correcta
    const json = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
      header: 1, // Array de arrays
      range: headerRow, // Começar da linha do header
    });
    
    // Primeira linha são os headers
    if (json.length < 2) return [];
    
    const headers = (json[0] as string[]).map(h => normalizeHeader(h || ""));
    const dataRows = json.slice(1) as string[][];
    
    // Mapear dados para objectos
    const records = dataRows
      .filter(row => row.some(cell => cell))
      .map(row => {
        const obj: Record<string, string> = {};
        headers.forEach((header, idx) => {
          if (header && row[idx]) {
            obj[header] = String(row[idx]);
          }
        });
        return obj;
      });
    
    console.log("Parsed records:", records.length, records[0]);
    return mapToProfiles(records);
  }
  // ... CSV handling unchanged
};
```

**4. Melhorar mapToProfiles para headers normalizados**
```typescript
const mapToProfiles = (data: Record<string, string>[]): ParsedProfile[] => {
  return data.map((row) => {
    // Normalizar todas as chaves do row
    const normalizedRow: Record<string, string> = {};
    Object.entries(row).forEach(([key, value]) => {
      normalizedRow[normalizeHeader(key)] = value;
    });
    
    const getName = () =>
      normalizedRow.full_name ||
      normalizedRow.nome ||
      normalizedRow.name ||
      normalizedRow.nome_completo ||
      `${normalizedRow.primeiro_nome || normalizedRow.first_name || ""} ${normalizedRow.apelido || normalizedRow.last_name || ""}`.trim();

    const getEmail = () =>
      normalizedRow.email || normalizedRow.e_mail;

    const getPhone = () =>
      normalizedRow.phone || normalizedRow.telefone || normalizedRow.telemovel;

    const getInterest = () =>
      normalizedRow.primary_interest ||
      normalizedRow.interesse ||
      normalizedRow.curso ||
      normalizedRow.formacao ||
      normalizedRow.area_de_interesse;

    const getSource = () =>
      normalizedRow.source || normalizedRow.origem || normalizedRow.canal;

    return {
      full_name: getName(),
      email: getEmail(),
      phone: getPhone(),
      primary_interest: getInterest(),
      source: getSource(),
      notes: normalizedRow.notes || normalizedRow.notas || normalizedRow.observacoes,
      lifecycle_stage: "lead" as LifecycleStage,
    };
  }).filter((p) => p.full_name);
};
```

## Fluxo Melhorado

```text
1. Utilizador carrega Excel
   ↓
2. Sistema lê ficheiro com XLSX
   ↓
3. Procura linha de headers (scan primeiras 10 linhas)
   ↓
4. Encontra linha onde há "nome", "email", etc.
   ↓
5. Extrai dados a partir dessa linha
   ↓
6. Normaliza headers (remove acentos, lowercase)
   ↓
7. Mapeia para campos esperados
   ↓
8. Mostra preview com perfis encontrados
```

## Headers Suportados Após Correcção

| Campo | Variações Aceites |
|-------|-------------------|
| Nome | nome, name, full_name, nome_completo |
| Email | email, e_mail, e-mail |
| Telefone | telefone, phone, telemovel, telemóvel |
| Interesse | interesse, curso, formacao, area_de_interesse |
| Origem | origem, source, canal |

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/student-journey/ImportProfilesDialog.tsx` | Detecção dinâmica de headers, normalização, melhor mapeamento |

## Resultado Esperado

1. Ficheiros Excel com headers em qualquer das primeiras 10 linhas são suportados
2. Variações de nomes de colunas são reconhecidas (com/sem acentos)
3. Mensagens de debug na consola para troubleshooting
4. Preview mostra correctamente os perfis encontrados
