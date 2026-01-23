import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEnrollments, useCourses, useCohorts } from "@/hooks/useStudentJourney";
import { EnrollmentStatus, PaymentStatus, EnrollmentSource } from "@/types/studentJourney";
import { Loader2 } from "lucide-react";

interface CreateEnrollmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileId?: string;
}

export function CreateEnrollmentDialog({
  open,
  onOpenChange,
  profileId,
}: CreateEnrollmentDialogProps) {
  const { createEnrollment } = useEnrollments();
  const { courses } = useCourses();
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const { cohorts } = useCohorts(selectedCourseId || undefined);

  const [cohortId, setCohortId] = useState("");
  const [status, setStatus] = useState<EnrollmentStatus>("interested");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("unpaid");
  const [source, setSource] = useState<EnrollmentSource>("manual");
  const [notes, setNotes] = useState("");

  const resetForm = () => {
    setSelectedCourseId("");
    setCohortId("");
    setStatus("interested");
    setPaymentStatus("unpaid");
    setSource("manual");
    setNotes("");
  };

  const handleSubmit = async () => {
    if (!profileId || !selectedCourseId) return;

    await createEnrollment.mutateAsync({
      profile_id: profileId,
      course_id: selectedCourseId,
      cohort_id: cohortId || undefined,
      status,
      payment_status: paymentStatus,
      source,
      notes: notes.trim() || undefined,
    });

    resetForm();
    onOpenChange(false);
  };

  const activeCourses = courses.filter((c) => c.is_active);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Inscrição</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-2">
            <Label>Curso *</Label>
            <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um curso..." />
              </SelectTrigger>
              <SelectContent>
                {activeCourses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedCourseId && cohorts.length > 0 && (
            <div className="grid gap-2">
              <Label>Turma (opcional)</Label>
              <Select value={cohortId} onValueChange={setCohortId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma turma..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sem turma específica</SelectItem>
                  {cohorts.map((cohort) => (
                    <SelectItem key={cohort.id} value={cohort.id}>
                      {cohort.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Origem</Label>
            <Select value={source} onValueChange={(v) => setSource(v as EnrollmentSource)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="import">Importação</SelectItem>
                <SelectItem value="checkout">Checkout</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Notas</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas adicionais..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createEnrollment.isPending || !selectedCourseId}
          >
            {createEnrollment.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Criar Inscrição
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
