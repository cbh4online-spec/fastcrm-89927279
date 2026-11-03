import { toast } from "sonner";
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
  const { updateCourse, courses } = useCourses();
  const [code, setCode] = useState("");
  const [category, setCategory] = useState("");
  const [previousId, setPreviousId] = useState("none");
  const [nextId, setNextId] = useState("none");

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
      const c = course as any;
      setCode(c.code ?? "");
      setCategory(c.category ?? "");
      setPreviousId(c.previous_course_id ?? "none");
      setNextId(c.next_course_id ?? "none");
    }
  }, [course]);

  const handleSubmit = async () => {
    if (!name.trim() || !course) return;
    if (previousId !== "none" && previousId === nextId) {
      toast.error("O curso anterior e o seguinte não podem ser o mesmo");
      return;
    }

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
      code: code.trim().slice(0, 40) || null,
      category: category.trim().slice(0, 80) || null,
      previous_course_id: previousId === "none" ? null : previousId,
      next_course_id: nextId === "none" ? null : nextId,
    } as any);

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="course-code">Código</Label>
              <Input id="course-code" value={code} maxLength={40} onChange={(e) => setCode(e.target.value)} placeholder="Ex: BAS" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="course-cat">Categoria</Label>
              <Input id="course-cat" value={category} maxLength={80} onChange={(e) => setCategory(e.target.value)} placeholder="Ex: Tricologia" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {([["Curso anterior", previousId, setPreviousId], ["Curso seguinte", nextId, setNextId]] as const).map(([label, val, setVal]) => (
              <div key={label} className="grid gap-2">
                <Label>{label}</Label>
                <Select value={val} onValueChange={setVal}>
                  <SelectTrigger aria-label={label}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {courses.filter((c) => c.id !== course?.id).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          <p className="-mt-2 text-xs text-muted-foreground">O percurso é só uma sugestão; não impede inscrições noutros cursos.</p>

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
