
# Plano: Corrigir Ações do Menu de Perfis

## Problemas Identificados

No ficheiro `SJProfiles.tsx`, três ações no menu dropdown não têm funcionalidade:

| Ação | Problema |
|------|----------|
| Nova Inscrição | Sem handler `onClick` |
| Gerar Mensagem IA | Sem handler `onClick` + requer `courseId` |
| Marcar Interesse | Sem handler `onClick` |

## Solução

### 1. Nova Inscrição

Adicionar estado e handler para abrir o `CreateEnrollmentDialog` já existente:

```text
Estado necessário:
- enrollmentDialogOpen: boolean
- selectedProfileForEnrollment: SJProfile | null

Handler:
onClick={() => handleNewEnrollment(profile)}
```

O `CreateEnrollmentDialog` já aceita um `profileId` como prop.

### 2. Gerar Mensagem IA

Criar um novo componente `GenerateMessageForProfileDialog` que permite:
- Gerar mensagem genérica (sem curso específico)
- OU seleccionar primeiro um curso para personalizar

Como a versão atual `RecommendationMessageDialog` requer `courseId`, vamos criar uma versão simplificada que:
1. Permite gerar mensagem sem curso (mensagem de reactivação/contacto)
2. Opcionalmente permite escolher um curso para personalizar

### 3. Marcar Interesse

Adicionar um diálogo simples para registar o interesse do aluno:
- Campo de texto para descrever o interesse
- Adiciona ao array `interests` do perfil

## Alterações Detalhadas

### Ficheiro: `SJProfiles.tsx`

**Adicionar estados:**
```typescript
const [enrollmentDialogOpen, setEnrollmentDialogOpen] = useState(false);
const [messageDialogOpen, setMessageDialogOpen] = useState(false);
const [interestDialogOpen, setInterestDialogOpen] = useState(false);
const [selectedProfile, setSelectedProfile] = useState<SJProfile | null>(null);
```

**Adicionar handlers:**
```typescript
const handleNewEnrollment = (profile: SJProfile) => {
  setSelectedProfile(profile);
  setEnrollmentDialogOpen(true);
};

const handleGenerateMessage = (profile: SJProfile) => {
  setSelectedProfile(profile);
  setMessageDialogOpen(true);
};

const handleMarkInterest = (profile: SJProfile) => {
  setSelectedProfile(profile);
  setInterestDialogOpen(true);
};
```

**Corrigir DropdownMenuItems:**
```typescript
<DropdownMenuItem onClick={() => handleNewEnrollment(profile)}>
  <ClipboardList className="h-4 w-4 mr-2" />
  Nova Inscrição
</DropdownMenuItem>
<DropdownMenuItem onClick={() => handleGenerateMessage(profile)}>
  <MessageSquare className="h-4 w-4 mr-2" />
  Gerar Mensagem IA
</DropdownMenuItem>
<DropdownMenuItem onClick={() => handleMarkInterest(profile)}>
  <Star className="h-4 w-4 mr-2" />
  Marcar Interesse
</DropdownMenuItem>
```

**Adicionar diálogos no render:**
```typescript
<CreateEnrollmentDialog
  open={enrollmentDialogOpen}
  onOpenChange={setEnrollmentDialogOpen}
  profileId={selectedProfile?.id}
/>
<GenerateMessageDialog
  open={messageDialogOpen}
  onOpenChange={setMessageDialogOpen}
  profile={selectedProfile}
/>
<AddInterestDialog
  open={interestDialogOpen}
  onOpenChange={setInterestDialogOpen}
  profile={selectedProfile}
/>
```

### Novo Ficheiro: `GenerateMessageDialog.tsx`

Diálogo para gerar mensagem personalizada (sem requerer curso):

```text
┌───────────────────────────────────────────┐
│    Gerar Mensagem para [Nome do Aluno]    │
├───────────────────────────────────────────┤
│                                           │
│ Tipo de mensagem:                         │
│ ○ Contacto geral                          │
│ ○ Convite para curso [Dropdown]           │
│ ○ Reativação                              │
│ ○ Follow-up                               │
│                                           │
│ [Gerar com IA]                            │
│                                           │
│ Assunto: ___________________________      │
│ Mensagem:                                 │
│ ┌─────────────────────────────────────┐   │
│ │                                     │   │
│ │                                     │   │
│ └─────────────────────────────────────┘   │
│                                           │
│ CTA: ___________________________          │
│                                           │
│            [Cancelar]  [Copiar]           │
└───────────────────────────────────────────┘
```

A edge function `sj-course-recommendations` já suporta `generate_message`, mas podemos adicionar uma nova acção `generate_contact_message` para mensagens sem curso.

### Novo Ficheiro: `AddInterestDialog.tsx`

Diálogo simples para adicionar interesse:

```text
┌─────────────────────────────────────┐
│     Marcar Interesse               │
├─────────────────────────────────────┤
│ Aluno: [Nome]                       │
│                                     │
│ Interesse/Área: ________________    │
│                                     │
│ Interesses actuais:                 │
│ [Tag1] [Tag2] [Tag3]               │
│                                     │
│         [Cancelar]  [Adicionar]     │
└─────────────────────────────────────┘
```

## Ficheiros a Criar/Modificar

| Ficheiro | Acção |
|----------|-------|
| src/pages/student-journey/SJProfiles.tsx | Modificar - adicionar handlers e diálogos |
| src/components/student-journey/GenerateMessageDialog.tsx | Criar |
| src/components/student-journey/AddInterestDialog.tsx | Criar |
| src/components/student-journey/index.ts | Modificar - exportar novos componentes |

## Edge Function

Adicionar acção `generate_contact_message` que não requer `courseId`:

```typescript
if (action === "generate_contact_message" && profileId) {
  // Gera mensagem de contacto/reativação genérica
}
```

## Resumo da Implementação

1. Corrigir `onClick` handlers vazios nos 3 menu items
2. Criar `GenerateMessageDialog` adaptado para uso sem curso obrigatório  
3. Criar `AddInterestDialog` para registar interesses rapidamente
4. Adicionar acção na edge function para mensagens genéricas
5. Importar e usar `CreateEnrollmentDialog` (já existe)
