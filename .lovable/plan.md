
# Plano: Adicionar Edição de Inscrições (Enrollments)

## Objectivo

Permitir editar as inscrições dos alunos directamente na página de detalhe do perfil, incluindo campos como estado, pagamento, progresso, turma e notas.

## Campos Editáveis

Com base no tipo `SJEnrollment`, os campos editáveis serão:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| status | EnrollmentStatus | Interessado, Convidado, Inscrito, Ativo, Concluído, Desistiu |
| payment_status | PaymentStatus | Por Pagar, Parcial, Pago, Reembolsado |
| progress_percent | number | Percentagem de progresso (0-100) |
| cohort_id | string/null | Turma associada (se o curso tiver turmas) |
| started_at | date/null | Data de início |
| completed_at | date/null | Data de conclusão |
| notes | string/null | Notas adicionais |

## Alterações Detalhadas

### 1. Criar EditEnrollmentDialog.tsx

Novo componente seguindo o padrão do EditCourseDialog:

```text
┌─────────────────────────────────────────┐
│          Editar Inscrição               │
├─────────────────────────────────────────┤
│ Curso: Marketing Digital (readonly)     │
│                                         │
│ Turma:     [Dropdown com turmas]        │
│                                         │
│ ┌─────────────┐  ┌─────────────┐       │
│ │ Estado:     │  │ Pagamento:  │       │
│ │ [Ativo    ▼]│  │ [Pago     ▼]│       │
│ └─────────────┘  └─────────────┘       │
│                                         │
│ Progresso: [═══════════════] 75%       │
│            [    Slider     ]            │
│                                         │
│ Data Início:    [__/__/____]           │
│ Data Conclusão: [__/__/____]           │
│                                         │
│ Notas:                                  │
│ ┌─────────────────────────────────┐    │
│ │                                 │    │
│ └─────────────────────────────────┘    │
│                                         │
│         [Cancelar]  [Guardar]          │
└─────────────────────────────────────────┘
```

### 2. Actualizar SJProfileDetail.tsx

Adicionar:
- Estado para controlar o diálogo de edição
- Botão de edição em cada card de inscrição
- Importar e renderizar o EditEnrollmentDialog

### 3. Exportar no index.ts

Adicionar exportação do novo componente

## Código do EditEnrollmentDialog

```typescript
// Estados inicializados com useEffect
const [status, setStatus] = useState<EnrollmentStatus>("enrolled");
const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("unpaid");
const [progressPercent, setProgressPercent] = useState(0);
const [cohortId, setCohortId] = useState<string | null>(null);
const [startedAt, setStartedAt] = useState("");
const [completedAt, setCompletedAt] = useState("");
const [notes, setNotes] = useState("");

// Carregar dados da inscrição
useEffect(() => {
  if (enrollment) {
    setStatus(enrollment.status);
    setPaymentStatus(enrollment.payment_status);
    setProgressPercent(enrollment.progress_percent);
    setCohortId(enrollment.cohort_id);
    setStartedAt(enrollment.started_at?.split("T")[0] || "");
    setCompletedAt(enrollment.completed_at?.split("T")[0] || "");
    setNotes(enrollment.notes || "");
  }
}, [enrollment]);

// Submit
const handleSubmit = async () => {
  await updateEnrollment.mutateAsync({
    id: enrollment.id,
    status,
    payment_status: paymentStatus,
    progress_percent: progressPercent,
    cohort_id: cohortId || null,
    started_at: startedAt ? new Date(startedAt).toISOString() : null,
    completed_at: completedAt ? new Date(completedAt).toISOString() : null,
    notes: notes.trim() || null,
  });
  onOpenChange(false);
};
```

## Alteração no Card de Inscrição

Adicionar botão de edição no header de cada inscrição:

```typescript
<div className="flex items-start justify-between">
  <div>
    <p className="font-medium">{enrollment.course?.name}</p>
    {enrollment.cohort && (
      <p className="text-sm text-muted-foreground">
        Turma: {enrollment.cohort.name}
      </p>
    )}
  </div>
  <div className="flex items-center gap-2">
    <Button
      variant="ghost"
      size="icon"
      onClick={() => {
        setEditingEnrollment(enrollment);
        setEditEnrollmentDialogOpen(true);
      }}
    >
      <Edit className="h-4 w-4" />
    </Button>
    <Badge className={...}>{statusConfig.label}</Badge>
  </div>
</div>
```

## Ficheiros a Criar/Modificar

| Ficheiro | Acção |
|----------|-------|
| src/components/student-journey/EditEnrollmentDialog.tsx | Criar |
| src/pages/student-journey/SJProfileDetail.tsx | Modificar |
| src/components/student-journey/index.ts | Modificar |

## Dependências

Utiliza componentes já existentes:
- Dialog, Button, Input, Label, Textarea
- Select (para status e payment_status)
- Slider (para progress_percent)
- useCohorts hook (para listar turmas do curso)
- useEnrollments hook (já tem updateEnrollment)
