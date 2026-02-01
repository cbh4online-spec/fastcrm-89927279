
# Plano: Adicionar Mapeamento de "Nº Cliente" na Importação de Perfis

## Problema Identificado

O diálogo de importação de perfis do Student Journey (`ImportProfilesDialog.tsx`) não permite mapear a coluna "Nº Cliente" do ficheiro Excel. Os campos disponíveis são:
- Nome, Email, Telefone, Formação/Curso, Origem/Fonte, Notas

O campo `client_number` foi recentemente adicionado às tabelas `contacts` e `companies`, mas:
1. A tabela `sj_profiles` não precisa deste campo (perfis estão ligados a contactos via `contact_id`)
2. A importação deve permitir usar "Nº Cliente" para matching com contactos existentes
3. Se não houver match, o `client_number` deve ser guardado no contacto quando este for criado/actualizado

## Alterações Técnicas

### 1. Adicionar "Nº Cliente" aos Tipos de Mapeamento

```typescript
// Linha 86 - Adicionar "n_cliente" ao tipo
type MappingFieldType = "nome" | "email" | "telefone" | "n_cliente" | "origem" | "notas" | "curso" | "ignorar";

// Linhas 98-106 - Adicionar à lista de campos
const MAPPING_FIELDS = [
  { value: "nome", label: "Nome", icon: User },
  { value: "email", label: "Email", icon: Mail },
  { value: "telefone", label: "Telefone", icon: Phone },
  { value: "n_cliente", label: "Nº Cliente", icon: Hash },  // NOVO
  { value: "curso", label: "Formação/Curso", icon: GraduationCap },
  { value: "origem", label: "Origem/Fonte", icon: Globe },
  { value: "notas", label: "Notas", icon: FileText },
  { value: "ignorar", label: "Ignorar coluna", icon: XCircle },
];
```

### 2. Adicionar Padrões de Detecção Automática

```typescript
// Linha 123 - Adicionar padrão para auto-detecção
const FIELD_PATTERNS: Record<MappingFieldType, string[]> = {
  // ... existentes
  n_cliente: ["n_cliente", "cliente", "client", "num_cliente", "numero_cliente", "cliente_numero", "client_number"],
  // ...
};
```

### 3. Actualizar Interface ParsedProfile

```typescript
// Linha 61-76 - Adicionar campo
interface ParsedProfile {
  full_name: string;
  email?: string;
  phone?: string;
  client_number?: string;  // NOVO
  // ... resto
}
```

### 4. Processar o Campo no Mapeamento

```typescript
// Linha 468 - No switch de processamento
case "n_cliente":
  profile.client_number = value;
  break;
```

### 5. Usar Nº Cliente no Matching com Contactos

O matching segue a ordem: **email → telefone → nº cliente → nome**

```typescript
// Linha 517-576 - Actualizar matchWithContacts
const { data: contacts } = await supabase
  .from("contacts")
  .select("id, name, email, phone, client_number")  // Adicionar client_number
  .eq("workspace_id", currentWorkspace.id);

// Após match de telefone, antes do nome:
// Try client_number match
if (profile.client_number) {
  const clientMatch = contacts.find(
    (c) => c.client_number?.toLowerCase() === profile.client_number?.toLowerCase()
  );
  if (clientMatch) {
    return {
      ...profile,
      matchedContactId: clientMatch.id,
      matchedContactName: clientMatch.name,
      matchType: "client_number" as const,
    };
  }
}
```

### 6. Actualizar Contacto com Nº Cliente na Importação

```typescript
// Linha 604 - Após criar o perfil, actualizar contacto se necessário
if (profile.matchedContactId && profile.client_number) {
  // Actualizar contacto com o client_number se ainda não tiver
  const { data: contact } = await supabase
    .from("contacts")
    .select("client_number")
    .eq("id", profile.matchedContactId)
    .single();
  
  if (contact && !contact.client_number) {
    await supabase
      .from("contacts")
      .update({ client_number: profile.client_number })
      .eq("id", profile.matchedContactId);
  }
}
```

### 7. Actualizar Tipo de matchType

```typescript
// Linha 73 - Adicionar novo tipo de match
matchType?: "email" | "phone" | "client_number" | "name";
```

## Fluxo do Utilizador

```text
1. Utilizador carrega Excel com coluna "Nº Cliente"
   ↓
2. Sistema detecta automaticamente e mapeia para "Nº Cliente"
   ↓
3. No matching, procura contactos com o mesmo client_number
   ↓
4. Se encontrar, liga o perfil ao contacto
5. Se não encontrar mas ligar a contacto por email/telefone:
   - Actualiza o client_number desse contacto
```

## Ficheiro a Modificar

| Ficheiro | Alterações |
|----------|-----------|
| `src/components/student-journey/ImportProfilesDialog.tsx` | Adicionar campo "Nº Cliente" ao mapeamento, matching e processamento |

## Resultado Esperado

1. Dropdown de mapeamento mostra opção "Nº Cliente"
2. Colunas com nomes como "Nº Cliente", "Cliente", "Número Cliente" são auto-detectadas
3. Matching usa `client_number` como critério (após telefone, antes do nome)
4. Contactos são actualizados com o `client_number` importado quando aplicável
