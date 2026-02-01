
# Plano: Criar Inscrições em Formações a partir do Excel

## Resumo

Criar uma funcionalidade de importação/actualização que processa o ficheiro Excel e cria inscrições no Student Journey para cada formação marcada com "x".

## Estrutura do Ficheiro Excel

O ficheiro contém as seguintes colunas relevantes:

| Coluna | Descrição |
|--------|-----------|
| **Nome** | Nome do cliente/contacto |
| **S/Formação** | Sem formação (ignorar) |
| **Iniciação** | Formação Iniciação - "x" se inscrito |
| **Básica** | Formação Básica - "x" se inscrito |
| **Avançada** | Formação Avançada - "x" se inscrito |
| **Tricologia** | Formação Tricologia - "x" se inscrito |
| **Aromaterapia** | Formação Aromaterapia - "x" se inscrito |
| **Valores 2024/2025** | Valores de compra (não utilizados nesta importação) |

## Cursos Existentes na Base de Dados

Os cursos já existem e correspondem às colunas do Excel:

| Coluna Excel | ID do Curso |
|--------------|-------------|
| Iniciação | f0a7d028-3a69-4905-8818-00e29ea3ab6e |
| Básica | abff51ab-a3e5-4fc7-8095-115ff0a60c37 |
| Avançada | d177873a-9680-4d39-a945-97c44cba437f |
| Tricologia | cc67fa71-ae30-426b-983b-1de997ac896a |
| Aromaterapia | 01d4f74e-ab13-4db3-b6f7-d4927ea296b8 |

## Fluxo de Processamento

```text
┌─────────────────────────────────────────┐
│  1. Ler cada linha do Excel             │
│     (Nome + colunas de formação)        │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  2. Procurar contacto pelo nome         │
│     (match case-insensitive)            │
└────────────────┬────────────────────────┘
                 │
        ┌────────┴────────┐
        │ Contacto        │
        │ encontrado?     │
        ├────────┬────────┤
        │ Sim    │ Não    │
        ▼        ▼        │
┌────────────┐   │ Saltar linha
│ 3. Procurar│   │ (reportar)
│ Perfil SJ  │   └─────────┘
│ existente  │
└────────┬───┘
         │
   ┌─────┴─────┐
   │ Perfil    │
   │ existe?   │
   ├─────┬─────┤
   │ Sim │ Não │
   ▼     ▼
┌──────────────────────────────────┐
│ 4. Para cada formação com "x":   │
│    - Verificar se já tem         │
│      inscrição nesse curso       │
│    - Se não, criar inscrição     │
│      com status "completed"      │
└──────────────────────────────────┘
```

## Alterações Técnicas

### 1. Novo Componente: BulkEnrollmentDialog

Criar um diálogo específico para importação em massa de inscrições:

**Localização**: `src/components/student-journey/BulkEnrollmentDialog.tsx`

**Funcionalidades**:
- Upload do ficheiro Excel
- Mapeamento automático das colunas de formação para cursos
- Preview das inscrições a criar
- Execução com progresso e relatório final

### 2. Lógica de Processamento

```typescript
// Para cada linha do Excel:
for (const row of excelData) {
  const contactName = row["Nome"];
  
  // 1. Encontrar contacto
  const contact = await findContactByName(contactName);
  if (!contact) {
    errors.push(`Contacto não encontrado: ${contactName}`);
    continue;
  }
  
  // 2. Encontrar ou criar perfil SJ
  let profile = await findProfileByContactId(contact.id);
  if (!profile) {
    profile = await createProfile({
      full_name: contactName,
      contact_id: contact.id,
      lifecycle_stage: "completed" // já completou formações
    });
  }
  
  // 3. Para cada coluna de formação com "x"
  for (const [columnName, courseId] of courseMapping) {
    if (row[columnName] === "x") {
      // Verificar se já existe inscrição
      const existingEnrollment = await checkEnrollment(profile.id, courseId);
      if (!existingEnrollment) {
        await createEnrollment({
          profile_id: profile.id,
          course_id: courseId,
          status: "completed",
          progress_percent: 100
        });
        enrollmentsCreated++;
      }
    }
  }
}
```

### 3. Mapeamento de Colunas

Criar mapeamento automático baseado nos nomes das colunas:

```typescript
const COURSE_COLUMN_MAPPING: Record<string, string> = {
  "iniciacao": "f0a7d028-3a69-4905-8818-00e29ea3ab6e",
  "basica": "abff51ab-a3e5-4fc7-8095-115ff0a60c37",
  "avancada": "d177873a-9680-4d39-a945-97c44cba437f",
  "tricologia": "cc67fa71-ae30-426b-983b-1de997ac896a",
  "aromaterapia": "01d4f74e-ab13-4db3-b6f7-d4927ea296b8"
};
```

### 4. Interface do Diálogo

**Passo 1 - Upload**:
- Área de upload do ficheiro Excel

**Passo 2 - Mapeamento**:
- Mostrar colunas detectadas como formações
- Associar cada coluna ao curso correspondente
- Indicar quantas linhas têm "x" em cada coluna

**Passo 3 - Preview**:
- Lista de inscrições a criar
- Número de contactos encontrados vs não encontrados
- Número de perfis a criar vs existentes

**Passo 4 - Importação**:
- Barra de progresso
- Relatório final com resultados

### 5. Ficheiros a Criar/Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/student-journey/BulkEnrollmentDialog.tsx` | **Novo** - Diálogo de importação em massa |
| `src/components/student-journey/ProfilesPage.tsx` | Adicionar botão para abrir o diálogo |

## Tratamento de Duplicados

- Antes de criar inscrição, verificar se já existe para o par (profile_id, course_id)
- Se existir, não duplicar (saltar silenciosamente)

## Resultado Esperado

1. Para cada cliente na tabela Excel que exista como contacto
2. Criar perfil Student Journey se não existir
3. Criar inscrições para cada formação marcada com "x"
4. Status das inscrições: "completed" (formação já realizada)
5. Relatório final com:
   - Contactos processados
   - Perfis criados
   - Inscrições criadas
   - Erros (contactos não encontrados)
