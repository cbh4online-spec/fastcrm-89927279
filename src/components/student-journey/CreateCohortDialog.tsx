import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCohorts, useCourses } from "@/hooks/useStudentJourney";
import { COHORT_STATUS_CONFIG, CohortStatus } from "@/types/studentJourney";
import { Loader2 } from "lucide-react";

interface CreateCohortDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateCohortDialog({ open, onOpenChange }: CreateCohortDialogProps) {
  const { createCohort } = useCohorts();
  const { courses } = useCourses();
  const [name, setName] = useState("");
  const [courseId, setCourseId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [capacity, setCapacity] = useState("");
  const [status, setStatus] = useState<CohortStatus>("planned");

  const resetForm = () => { setName(""); setCourseId(""); setStartDate(""); setEndDate(""); setCapacity(""); setStatus("planned"); };

  const handleSubmit = async () => {
    if (!name.trim() || !courseId) return;
    await createCohort.mutateAsync({
      name: name.trim(),
      course_id: courseId,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      capacity: capacity ? parseInt(capacity) : undefined,
      status,
    });
    resetForm();
    onOpenChange(false);
  };

  const statuses = Object.entries(COHORT_STATUS_CONFIG);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Criar Turma</DialogTitle></DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2"><Label>Nome *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Turma Jan 2026" /></div>
          <div className="grid gap-2"><Label>Curso *</Label>
            <Select value={courseId} onValueChange={setCourseId}><SelectTrigger><SelectValue placeholder="Selecione o curso..." /></SelectTrigger><SelectContent>{courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2"><Label>Data Início</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
            <div className="grid gap-2"><Label>Data Fim</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2"><Label>Capacidade</Label><Input type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} /></div>
            <div className="grid gap-2"><Label>Estado</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as CohortStatus)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{statuses.map(([key, config]) => <SelectItem key={key} value={key}>{config.label}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={createCohort.isPending || !name.trim() || !courseId}>
            {createCohort.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Criar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
