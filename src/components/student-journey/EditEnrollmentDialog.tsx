import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEnrollments, useCohorts } from "@/hooks/useStudentJourney";
import type { SJEnrollment, EnrollmentStatus, PaymentStatus } from "@/types/studentJourney";
import { Loader2 } from "lucide-react";

interface EditEnrollmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enrollment: SJEnrollment | null;
}

export function EditEnrollmentDialog({
  open,
  onOpenChange,
  enrollment,
}: EditEnrollmentDialogProps) {
  const { updateEnrollment } = useEnrollments();
  const { cohorts } = useCohorts(enrollment?.course_id || undefined);

  const [status, setStatus] = useState<EnrollmentStatus>("enrolled");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("unpaid");
  const [progressPercent, setProgressPercent] = useState(0);
  const [cohortId, setCohortId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState("");
  const [completedAt, setCompletedAt] = useState("");
  const [notes, setNotes] = useState("");

  // Load enrollment data when dialog opens
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

  const handleSubmit = async () => {
    if (!enrollment) return;

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

  if (!enrollment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Inscrição</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Course Name (readonly) */}
          <div className="grid gap-2">
            <Label className="text-muted-foreground">Curso</Label>
            <p className="font-medium">{enrollment.course?.name || "Curso"}</p>
          </div>

          {/* Cohort Selection */}
          {cohorts.length > 0 && (
            <div className="grid gap-2">
              <Label>Turma</Label>
              <Select
                value={cohortId || "none"}
                onValueChange={(v) => setCohortId(v === "none" ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma turma..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem turma específica</SelectItem>
                  {cohorts.map((cohort) => (
                    <SelectItem key={cohort.id} value={cohort.id}>
                      {cohort.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Status and Payment */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Estado</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as EnrollmentStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="interested">Interessado</SelectItem>
                  <SelectItem value="invited">Convidado</SelectItem>
                  <SelectItem value="enrolled">Inscrito</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                  <SelectItem value="dropped">Desistiu</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Pagamento</Label>
              <Select value={paymentStatus} onValueChange={(v) => setPaymentStatus(v as PaymentStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unpaid">Por Pagar</SelectItem>
                  <SelectItem value="partial">Parcial</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                  <SelectItem value="refunded">Reembolsado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Progress Slider */}
          <div className="grid gap-3">
            <div className="flex items-center justify-between">
              <Label>Progresso</Label>
              <span className="text-sm font-medium">{progressPercent}%</span>
            </div>
            <Slider
              value={[progressPercent]}
              onValueChange={(v) => setProgressPercent(v[0])}
              max={100}
              step={1}
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Data Início</Label>
              <Input
                type="date"
                value={startedAt}
                onChange={(e) => setStartedAt(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Data Conclusão</Label>
              <Input
                type="date"
                value={completedAt}
                onChange={(e) => setCompletedAt(e.target.value)}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="grid gap-2">
            <Label>Notas</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas adicionais..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={updateEnrollment.isPending}>
            {updateEnrollment.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
