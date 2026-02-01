import { useState, useEffect } from "react";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCourses } from "@/hooks/useStudentJourney";
import { SJCourse, CourseType, CourseProvider } from "@/types/studentJourney";
import { Loader2 } from "lucide-react";

interface EditCourseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: SJCourse | null;
}

export function EditCourseDialog({ open, onOpenChange, course }: EditCourseDialogProps) {
  const { updateCourse } = useCourses();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [courseType, setCourseType] = useState<CourseType>("online");
  const [provider, setProvider] = useState<CourseProvider>("internal");
  const [cohortEnabled, setCohortEnabled] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [tags, setTags] = useState("");

  useEffect(() => {
    if (course) {
      setName(course.name);
      setDescription(course.description || "");
      setCourseType(course.course_type);
      setProvider(course.provider);
      setCohortEnabled(course.cohort_enabled);
      setIsActive(course.is_active);
      setTags(course.tags?.join(", ") || "");
    }
  }, [course]);

  const handleSubmit = async () => {
    if (!name.trim() || !course) return;

    await updateCourse.mutateAsync({
      id: course.id,
      name: name.trim(),
      description: description.trim() || null,
      course_type: courseType,
      provider,
      cohort_enabled: cohortEnabled,
      is_active: isActive,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Curso</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-2">
            <Label>Nome *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Marketing Digital Avançado"
            />
          </div>

          <div className="grid gap-2">
            <Label>Descrição</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição do curso..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Tipo</Label>
              <Select value={courseType} onValueChange={(v) => setCourseType(v as CourseType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="presencial">Presencial</SelectItem>
                  <SelectItem value="hibrido">Híbrido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Provedor</Label>
              <Select value={provider} onValueChange={(v) => setProvider(v as CourseProvider)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal">Interno</SelectItem>
                  <SelectItem value="kajabi">Kajabi</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Tags (separadas por vírgula)</Label>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Ex: Marketing, Digital, Avançado"
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <Label>Turmas (Cohorts)</Label>
              <p className="text-xs text-muted-foreground">Permite criar turmas com datas específicas</p>
            </div>
            <Switch checked={cohortEnabled} onCheckedChange={setCohortEnabled} />
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <Label>Curso Ativo</Label>
              <p className="text-xs text-muted-foreground">Cursos inativos não aparecem para novos alunos</p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={updateCourse.isPending || !name.trim()}>
            {updateCourse.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Guardar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
