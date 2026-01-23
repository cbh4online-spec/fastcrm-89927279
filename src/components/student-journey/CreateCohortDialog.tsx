import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCohorts } from "@/hooks/useStudentJourney";
import { COHORT_STATUS_CONFIG, CohortStatus } from "@/types/studentJourney";
import { Loader2 } from "lucide-react";

interface CreateCohortDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateCohortDialog({
  open,
  onOpenChange,
}: CreateCohortDialogProps) {
  const { createCohort } = useCohorts();

  const [name, setName] = useState("");
  const [courseName, setCourseName] = useState("");
  const [courseCategory, setCourseCategory] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [maxStudents, setMaxStudents] = useState("");
  const [status, setStatus] = useState<CohortStatus>("planned");

  const resetForm = () => {
    setName("");
    setCourseName("");
    setCourseCategory("");
    setDescription("");
    setStartDate("");
    setEndDate("");
    setMaxStudents("");
    setStatus("planned");
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;

    await createCohort.mutateAsync({
      name: name.trim(),
      course_name: courseName.trim() || undefined,
      course_category: courseCategory.trim() || undefined,
      description: description.trim() || undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      max_students: maxStudents ? parseInt(maxStudents) : undefined,
      status,
    });

    resetForm();
    onOpenChange(false);
  };

  const statuses = Object.entries(COHORT_STATUS_CONFIG).filter(
    ([key]) => key !== "cancelled"
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Criar Nova Turma</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Nome da Turma *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Turma Marketing Digital - Janeiro 2026"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="courseName">Nome do Curso</Label>
              <Input
                id="courseName"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                placeholder="Ex: Marketing Digital"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="courseCategory">Categoria</Label>
              <Input
                id="courseCategory"
                value={courseCategory}
                onChange={(e) => setCourseCategory(e.target.value)}
                placeholder="Ex: Marketing"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="startDate">Data de Início</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="endDate">Data de Fim</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="maxStudents">Máximo de Alunos</Label>
              <Input
                id="maxStudents"
                type="number"
                value={maxStudents}
                onChange={(e) => setMaxStudents(e.target.value)}
                placeholder="Ex: 30"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">Estado</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as CohortStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição da turma..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createCohort.isPending || !name.trim()}
          >
            {createCohort.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            Criar Turma
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
