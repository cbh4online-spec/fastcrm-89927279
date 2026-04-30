import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useCohorts, useCourses } from "@/hooks/useStudentJourney";
import { useCohortPhases } from "@/hooks/useCohortPhases";
import { COHORT_STATUS_CONFIG, CohortStatus } from "@/types/studentJourney";
import { Loader2 } from "lucide-react";
import { PhasesEditor, PhaseDraft, validatePhases } from "./PhasesEditor";
import { toast } from "sonner";

interface CreateCohortDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCourseId?: string;
}

export function CreateCohortDialog({ open, onOpenChange, defaultCourseId }: CreateCohortDialogProps) {
  const { createCohort } = useCohorts();
  const { courses } = useCourses();
  const { replacePhases } = useCohortPhases(undefined);
  const [name, setName] = useState("");
  const [courseId, setCourseId] = useState(defaultCourseId || "");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [capacity, setCapacity] = useState("");
  const [status, setStatus] = useState<CohortStatus>("planned");
  const [phases, setPhases] = useState<PhaseDraft[]>([]);

  useEffect(() => {
    if (defaultCourseId) setCourseId(defaultCourseId);
  }, [defaultCourseId]);

  const resetForm = () => {
    setName("");
    setCourseId(defaultCourseId || "");
    setStartDate("");
    setEndDate("");
    setCapacity("");
    setStatus("planned");
    setPhases([]);
  };

  const phaseIssues = validatePhases(phases);
  const hasPhaseErrors = phaseIssues.length > 0;

  const handleSubmit = async () => {
    if (!name.trim() || !courseId) return;
    if (hasPhaseErrors) {
      toast.error("Resolva os problemas nas fases antes de guardar");
      return;
    }

    // Calcular datas agregadas a partir das fases (se existirem)
    let aggStart = startDate || undefined;
    let aggEnd = endDate || undefined;
    if (phases.length > 0) {
      const sorted = [...phases].sort((a, b) => a.start_date.localeCompare(b.start_date));
      aggStart = sorted[0].start_date;
      aggEnd = sorted.reduce((max, p) => (p.end_date > max ? p.end_date : max), sorted[0].end_date);
    }

    try {
      const cohort = await createCohort.mutateAsync({
        name: name.trim(),
        course_id: courseId,
        start_date: aggStart,
        end_date: aggEnd,
        capacity: capacity ? parseInt(capacity) : undefined,
        status,
      });

      if (phases.length > 0 && cohort?.id) {
        await replacePhases.mutateAsync({
          cohortId: cohort.id,
          phases: phases.map((p, idx) => ({
            phase_order: idx + 1,
            title: p.title,
            location: p.location || null,
            start_date: p.start_date,
            end_date: p.end_date,
            start_time: p.start_time || null,
            end_time: p.end_time || null,
            notes: p.notes || null,
          })),
        });
      }

      resetForm();
      onOpenChange(false);
    } catch (err) {
      console.error("[CreateCohortDialog] error:", err);
    }
  };

  const statuses = Object.entries(COHORT_STATUS_CONFIG);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Turma</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Nome *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Turma Jan 2026" maxLength={120} />
          </div>
          <div className="grid gap-2">
            <Label>Curso *</Label>
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger><SelectValue placeholder="Selecione o curso..." /></SelectTrigger>
              <SelectContent>
                {courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {phases.length === 0 && (
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Data Início</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
              <div className="grid gap-2"><Label>Data Fim</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2"><Label>Capacidade</Label><Input type="number" min={0} value={capacity} onChange={(e) => setCapacity(e.target.value)} /></div>
            <div className="grid gap-2">
              <Label>Estado</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as CohortStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {statuses.map(([key, config]) => <SelectItem key={key} value={key}>{config.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <PhasesEditor phases={phases} onChange={setPhases} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={handleSubmit}
            disabled={createCohort.isPending || replacePhases.isPending || !name.trim() || !courseId || hasPhaseErrors}
          >
            {(createCohort.isPending || replacePhases.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Criar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
