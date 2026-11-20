import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Search } from "lucide-react";
import { useEnrollments, useProfiles } from "@/hooks/useStudentJourney";
import { cn } from "@/lib/utils";

const norm = (s?: string | null) =>
  (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cohortId: string;
  courseId: string;
  enrolledProfileIds: string[];
}

export function CohortEnrollDialog({ open, onOpenChange, cohortId, courseId, enrolledProfileIds }: Props) {
  const { profiles, isLoading } = useProfiles();
  const { createEnrollment } = useEnrollments();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const results = useMemo(() => {
    const q = norm(search.trim());
    const taken = new Set(enrolledProfileIds);
    return profiles
      .filter((p: any) => !p.archived_at && !taken.has(p.id))
      .filter((p: any) => !q || norm(p.full_name).includes(q) || norm(p.email).includes(q) || norm(p.phone).includes(q))
      .slice(0, 50);
  }, [profiles, search, enrolledProfileIds]);

  const handleSubmit = async () => {
    if (!selected) return;
    await createEnrollment.mutateAsync({
      profile_id: selected,
      course_id: courseId,
      cohort_id: cohortId,
      status: "enrolled",
      source: "manual",
    });
    setSelected(null);
    setSearch("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Inscrever aluno nesta turma</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar por nome, email ou telefone..."
            className="pl-9"
            aria-label="Pesquisar aluno"
          />
        </div>
        <ScrollArea className="h-72 rounded-md border">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : results.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhum aluno encontrado.</p>
          ) : (
            results.map((p: any) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelected(p.id)}
                className={cn(
                  "w-full border-b px-3 py-2 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none",
                  selected === p.id && "bg-primary/10"
                )}
              >
                <p className="font-medium">{p.full_name || "Sem nome"}</p>
                <p className="text-xs text-muted-foreground">{[p.email, p.phone].filter(Boolean).join(" · ") || "Sem contactos"}</p>
              </button>
            ))
          )}
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!selected || createEnrollment.isPending}>
            {createEnrollment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Inscrever
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
