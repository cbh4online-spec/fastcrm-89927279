import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { GraduationCap, Plus, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { allowsEnrollment, statusForStage, validateStageMove } from "@/lib/studentJourney/admissions";

const db = supabase as any;
const eur = (n: number) => new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(n || 0);
const fmt = (d?: string | null) => (d ? new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short", timeZone: "Europe/Lisbon" }).format(new Date(d)) : "—");

type Stage = { id: string; name: string; position: number; color: string; probability: number; config: { stage_code?: string } };
type Opp = {
  id: string; title: string; value: number; stage_id: string; status: string; source: string | null; campaign: string | null;
  contact_id: string | null; sj_course_id: string | null; sj_cohort_id: string | null; sj_enrollment_id: string | null;
  last_contact_at: string | null; next_action: string | null; next_action_at: string | null; lost_reason: string | null;
  contact?: { name: string } | null;
};

export default function SJAdmissions() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const ws = currentWorkspace?.id;
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Opp | null>(null);

  const pipelineQ = useQuery({
    queryKey: ["sj-admissions-pipeline", ws],
    enabled: !!ws,
    queryFn: async () => {
      const { data, error } = await db.rpc("sj_ensure_admissions_pipeline", { _workspace_id: ws });
      if (error) throw error;
      const { data: stages, error: e2 } = await db.from("pipeline_stages").select("id,name,position,color,probability,config").eq("pipeline_id", data).order("position");
      if (e2) throw e2;
      return { pipelineId: data as string, stages: (stages ?? []) as Stage[] };
    },
  });
  const pipelineId = pipelineQ.data?.pipelineId;
  const stages = pipelineQ.data?.stages ?? [];
  const codeOf = (stageId: string) => stages.find((s) => s.id === stageId)?.config?.stage_code;

  const oppsQ = useQuery({
    queryKey: ["sj-admissions-opps", ws, pipelineId],
    enabled: !!ws && !!pipelineId,
    queryFn: async () => {
      const { data, error } = await db.from("opportunities")
        .select("id,title,value,stage_id,status,source,campaign,contact_id,sj_course_id,sj_cohort_id,sj_enrollment_id,last_contact_at,next_action,next_action_at,lost_reason,contact:contacts(name)")
        .eq("workspace_id", ws).eq("pipeline_id", pipelineId).order("created_at", { ascending: false }).limit(1000);
      if (error) throw error;
      return (data ?? []) as Opp[];
    },
  });

  const coursesQ = useQuery({
    queryKey: ["sj-courses-lite", ws], enabled: !!ws,
    queryFn: async () => { const { data, error } = await db.from("sj_courses").select("id,name").eq("workspace_id", ws).order("name"); if (error) throw error; return data as { id: string; name: string }[]; },
  });
  const cohortsQ = useQuery({
    queryKey: ["sj-cohorts-lite", ws], enabled: !!ws,
    queryFn: async () => { const { data, error } = await db.from("sj_cohorts").select("id,name,course_id,city,start_date,edition_status").eq("workspace_id", ws).order("start_date", { ascending: false }); if (error) throw error; return data as any[]; },
  });
  const courseName = (id: string | null) => coursesQ.data?.find((c) => c.id === id)?.name;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (oppsQ.data ?? []).filter((o) =>
      (courseFilter === "all" || o.sj_course_id === courseFilter) &&
      (!q || [o.title, o.contact?.name, o.source, o.campaign].some((v) => v?.toLowerCase().includes(q))));
  }, [oppsQ.data, search, courseFilter]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["sj-admissions-opps", ws] });

  const save = useMutation({
    mutationFn: async (o: Partial<Opp> & { id?: string }) => {
      const code = codeOf(o.stage_id!);
      const err = validateStageMove(code, o.lost_reason);
      if (err) throw new Error(err);
      const payload: any = {
        title: o.title, value: Number(o.value) || 0, stage_id: o.stage_id, status: statusForStage(code),
        source: o.source || null, campaign: o.campaign || null, contact_id: o.contact_id || null,
        sj_course_id: o.sj_course_id || null, sj_cohort_id: o.sj_cohort_id || null,
        last_contact_at: o.last_contact_at || null, next_action: o.next_action || null, next_action_at: o.next_action_at || null,
        lost_reason: code === "lost" ? o.lost_reason : null,
      };
      if (o.id) {
        const { error } = await db.from("opportunities").update(payload).eq("id", o.id);
        if (error) throw error;
      } else {
        const { error } = await db.from("opportunities").insert({ ...payload, workspace_id: ws, owner_id: user!.id, pipeline_id: pipelineId, currency: "EUR" });
        if (error) throw error;
      }
    },
    onSuccess: () => { invalidate(); toast.success("Oportunidade guardada"); setCreating(false); setEditing(null); },
    onError: (e: Error) => toast.error(e.message || "Erro ao guardar"),
  });

  const convert = useMutation({
    mutationFn: async ({ id, cohort }: { id: string; cohort: string | null }) => {
      const { error } = await db.rpc("sj_convert_opportunity_to_enrollment", { _opportunity_id: id, _cohort_id: cohort });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); qc.invalidateQueries({ queryKey: ["sj-enrollments"] }); toast.success("Inscrição criada na Jornada"); setEditing(null); },
    onError: (e: Error) => toast.error(e.message || "Erro ao criar inscrição"),
  });

  const onDrop = (oppId: string, stageId: string) => {
    const o = oppsQ.data?.find((x) => x.id === oppId);
    if (!o || o.stage_id === stageId) return;
    if (codeOf(stageId) === "lost") { setEditing({ ...o, stage_id: stageId }); toast.info("Indique o motivo de perda."); return; }
    save.mutate({ ...o, stage_id: stageId });
  };

  if (pipelineQ.isError) return <div className="p-6 text-sm text-destructive">Não foi possível carregar o pipeline de admissões.</div>;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Admissões</h1>
          <p className="text-sm text-muted-foreground">Pipeline comercial de interessados até à matrícula.</p>
        </div>
        <Button onClick={() => setCreating(true)} disabled={!pipelineId}><Plus className="h-4 w-4 mr-1" />Nova oportunidade</Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input aria-label="Pesquisar" className="h-11 rounded-full pl-10" placeholder="Pesquisar nome, origem ou campanha" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={courseFilter} onValueChange={setCourseFilter}>
          <SelectTrigger className="w-[220px] h-11 rounded-full" aria-label="Filtrar por curso"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os cursos</SelectItem>
            {coursesQ.data?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {pipelineQ.isLoading || oppsQ.isLoading ? (
        <div className="flex gap-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-64 w-72" />)}</div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {stages.map((s) => {
            const items = filtered.filter((o) => o.stage_id === s.id);
            return (
              <section key={s.id} aria-label={s.name} className="w-72 shrink-0 rounded-2xl border bg-card"
                onDragOver={(e) => e.preventDefault()} onDrop={(e) => onDrop(e.dataTransfer.getData("text/plain"), s.id)}>
                <header className="flex items-center justify-between border-b px-3 py-2">
                  <span className="flex items-center gap-2 text-sm font-semibold"><span className="h-2 w-2 rounded-full" style={{ background: s.color }} />{s.name}</span>
                  <Badge variant="secondary">{items.length}</Badge>
                </header>
                <div className="space-y-2 p-2 min-h-[120px]">
                  {items.length === 0 && <p className="px-1 py-4 text-center text-xs text-muted-foreground">Sem oportunidades</p>}
                  {items.map((o) => (
                    <button key={o.id} draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", o.id)} onClick={() => setEditing(o)}
                      className="w-full rounded-xl border bg-background p-3 text-left hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <p className="text-sm font-medium truncate">{o.contact?.name || o.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{courseName(o.sj_course_id) || "Curso por definir"}</p>
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span className="font-semibold">{eur(o.value)}</span>
                        {o.sj_enrollment_id ? <Badge variant="outline" className="gap-1"><GraduationCap className="h-3 w-3" />Inscrito</Badge>
                          : <span className="text-muted-foreground">{o.next_action ? `${o.next_action} · ${fmt(o.next_action_at)}` : o.source || ""}</span>}
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {(creating || editing) && (
        <OppDialog
          key={editing?.id ?? "new"}
          initial={editing ?? { stage_id: stages[0]?.id, value: 0 } as any}
          stages={stages} courses={coursesQ.data ?? []} cohorts={cohortsQ.data ?? []}
          saving={save.isPending} converting={convert.isPending}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSave={(o) => save.mutate(o)}
          onConvert={(id, cohort) => convert.mutate({ id, cohort })}
          canConvert={(o) => !!o.id && allowsEnrollment(codeOf(o.stage_id))}
        />
      )}
    </div>
  );
}

function OppDialog({ initial, stages, courses, cohorts, saving, converting, onClose, onSave, onConvert, canConvert }: {
  initial: Partial<Opp>; stages: Stage[]; courses: { id: string; name: string }[]; cohorts: any[];
  saving: boolean; converting: boolean; onClose: () => void; onSave: (o: Partial<Opp>) => void;
  onConvert: (id: string, cohort: string | null) => void; canConvert: (o: Partial<Opp>) => boolean;
}) {
  const { currentWorkspace } = useWorkspace();
  const [f, setF] = useState<Partial<Opp>>(initial);
  const [contactSearch, setContactSearch] = useState("");
  const set = (k: keyof Opp, v: any) => setF((p) => ({ ...p, [k]: v }));
  const stageCode = stages.find((s) => s.id === f.stage_id)?.config?.stage_code;
  const courseCohorts = cohorts.filter((c) => !f.sj_course_id || c.course_id === f.sj_course_id);

  const contactsQ = useQuery({
    queryKey: ["sj-adm-contacts", currentWorkspace?.id, contactSearch],
    enabled: !!currentWorkspace && contactSearch.trim().length >= 2,
    queryFn: async () => {
      const { data, error } = await db.from("contacts").select("id,name,email").eq("workspace_id", currentWorkspace!.id).ilike("name", `%${contactSearch.trim()}%`).limit(8);
      if (error) throw error;
      return data as { id: string; name: string; email: string | null }[];
    },
  });

  const valid = !!f.title?.trim() || !!f.contact_id;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>{f.id ? "Oportunidade de admissão" : "Nova oportunidade de admissão"}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          {!f.id && (
            <div className="space-y-1">
              <Label htmlFor="adm-contact">Contacto / aluno</Label>
              <Input id="adm-contact" placeholder="Pesquisar contacto (mín. 2 letras)" value={contactSearch} onChange={(e) => setContactSearch(e.target.value)} />
              {contactsQ.data?.map((c) => (
                <button key={c.id} type="button" onClick={() => { set("contact_id", c.id); setF((p) => ({ ...p, contact_id: c.id, title: p.title || c.name })); setContactSearch(c.name); }}
                  className={`block w-full rounded-md px-2 py-1 text-left text-sm hover:bg-muted ${f.contact_id === c.id ? "bg-muted font-medium" : ""}`}>
                  {c.name} <span className="text-muted-foreground">{c.email}</span>
                </button>
              ))}
            </div>
          )}
          <div className="space-y-1"><Label htmlFor="adm-title">Título</Label><Input id="adm-title" maxLength={200} value={f.title ?? ""} onChange={(e) => set("title", e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Etapa</Label>
              <Select value={f.stage_id} onValueChange={(v) => set("stage_id", v)}><SelectTrigger aria-label="Etapa"><SelectValue /></SelectTrigger>
                <SelectContent>{stages.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1"><Label htmlFor="adm-value">Valor potencial (€)</Label><Input id="adm-value" type="number" min={0} value={f.value ?? 0} onChange={(e) => set("value", e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Curso pretendido</Label>
              <Select value={f.sj_course_id ?? ""} onValueChange={(v) => setF((p) => ({ ...p, sj_course_id: v, sj_cohort_id: null }))}><SelectTrigger aria-label="Curso"><SelectValue placeholder="Escolher" /></SelectTrigger>
                <SelectContent>{courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1"><Label>Turma pretendida</Label>
              <Select value={f.sj_cohort_id ?? ""} onValueChange={(v) => set("sj_cohort_id", v)}><SelectTrigger aria-label="Turma"><SelectValue placeholder="Opcional" /></SelectTrigger>
                <SelectContent>{courseCohorts.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}{c.city ? ` · ${c.city}` : ""}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label htmlFor="adm-source">Origem</Label><Input id="adm-source" maxLength={100} value={f.source ?? ""} onChange={(e) => set("source", e.target.value)} /></div>
            <div className="space-y-1"><Label htmlFor="adm-campaign">Campanha</Label><Input id="adm-campaign" maxLength={150} value={f.campaign ?? ""} onChange={(e) => set("campaign", e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label htmlFor="adm-last">Último contacto</Label><Input id="adm-last" type="date" value={f.last_contact_at?.slice(0, 10) ?? ""} onChange={(e) => set("last_contact_at", e.target.value || null)} /></div>
            <div className="space-y-1"><Label htmlFor="adm-nextat">Data da próxima ação</Label><Input id="adm-nextat" type="date" value={f.next_action_at?.slice(0, 10) ?? ""} onChange={(e) => set("next_action_at", e.target.value || null)} /></div>
          </div>
          <div className="space-y-1"><Label htmlFor="adm-next">Próxima ação</Label><Input id="adm-next" maxLength={200} value={f.next_action ?? ""} onChange={(e) => set("next_action", e.target.value)} /></div>
          {stageCode === "lost" && (
            <div className="space-y-1"><Label htmlFor="adm-lost">Motivo de perda *</Label><Textarea id="adm-lost" maxLength={500} value={f.lost_reason ?? ""} onChange={(e) => set("lost_reason", e.target.value)} /></div>
          )}
          {f.sj_enrollment_id && <p className="text-sm text-muted-foreground">Já tem inscrição criada na Jornada do Aluno.</p>}
        </div>
        <DialogFooter className="gap-2 sm:gap-2 flex-wrap">
          {f.contact_id && <Button variant="ghost" asChild><Link to={`/dashboard/contacts/${f.contact_id}`}>Ver contacto</Link></Button>}
          {canConvert(f) && !f.sj_enrollment_id && (
            <Button variant="outline" disabled={converting || !f.sj_course_id} onClick={() => onConvert(f.id!, f.sj_cohort_id ?? null)}>
              <GraduationCap className="h-4 w-4 mr-1" />Criar inscrição
            </Button>
          )}
          <Button disabled={saving || !valid} onClick={() => onSave({ ...f, title: f.title?.trim() || "Admissão" })}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
