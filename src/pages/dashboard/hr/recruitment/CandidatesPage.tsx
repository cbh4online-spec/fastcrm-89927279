import { useCandidates, useCreateCandidate, useDeleteCandidate } from "@/hooks/hr/useCandidates";
import type { Candidate, CandidateStage } from "@/hooks/hr/useCandidates";
import { useJobPostings } from "@/hooks/hr/useJobPostings";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Trash2, ExternalLink, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";

const STAGE_LABELS: Record<CandidateStage, string> = {
  new: "Novo", screening: "Triagem", phone_interview: "Telefone",
  technical_interview: "Técnica", onsite_interview: "Presencial",
  offer: "Oferta", hired: "Contratado", rejected: "Rejeitado",
};

export default function CandidatesPage() {
  const { data: candidates, isLoading } = useCandidates();
  const { data: jobs } = useJobPostings();
  const createCandidate = useCreateCandidate();
  const deleteCandidate = useDeleteCandidate();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<Partial<Candidate>>({
    first_name: "", last_name: "", email: "", phone: "", source: "manual", job_posting_id: null,
  });

  const filtered = candidates?.filter(c =>
    `${c.first_name} ${c.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    if (!form.first_name?.trim() || !form.last_name?.trim()) { toast.error("Nome e apelido são obrigatórios"); return; }
    if (!form.email?.trim()) { toast.error("Email é obrigatório"); return; }
    await createCandidate.mutateAsync(form);
    setDialogOpen(false);
    setForm({ first_name: "", last_name: "", email: "", phone: "", source: "manual", job_posting_id: null });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Candidatos</h1>
          <p className="text-muted-foreground">Base de dados de candidatos</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Novo Candidato</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Adicionar Candidato</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input value={form.first_name || ""} onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Apelido *</Label>
                  <Input value={form.last_name || ""} onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input type="email" value={form.email || ""} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input value={form.phone || ""} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>LinkedIn</Label>
                  <Input value={form.linkedin_url || ""} onChange={e => setForm(p => ({ ...p, linkedin_url: e.target.value }))} placeholder="https://linkedin.com/in/..." />
                </div>
                <div className="space-y-2">
                  <Label>Vaga</Label>
                  <Select value={form.job_posting_id || "none"} onValueChange={v => setForm(p => ({ ...p, job_posting_id: v === "none" ? null : v }))}>
                    <SelectTrigger><SelectValue placeholder="Sem vaga" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem vaga</SelectItem>
                      {jobs?.map(j => <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreate} disabled={createCandidate.isPending}>Criar</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Pesquisar candidatos..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Candidato</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Vaga</TableHead>
              <TableHead>Etapa</TableHead>
              <TableHead>IA</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">A carregar...</TableCell></TableRow>
            ) : !filtered?.length ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Sem candidatos</TableCell></TableRow>
            ) : (
              filtered.map(c => (
                <TableRow key={c.id} className="cursor-pointer" onClick={() => navigate(`/dashboard/hr/recruitment/candidates/${c.id}`)}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">{c.first_name[0]}{c.last_name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{c.first_name} {c.last_name}</p>
                        {c.linkedin_url && <a href={c.linkedin_url} target="_blank" rel="noopener" onClick={e => e.stopPropagation()} className="text-xs text-primary flex items-center gap-1"><ExternalLink className="h-3 w-3" />LinkedIn</a>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.email}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.job_posting?.title || "—"}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{STAGE_LABELS[c.stage] || c.stage}</Badge></TableCell>
                  <TableCell>
                    {c.ai_score != null ? (
                      <div className="flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-amber-500" />
                        <span className="text-sm font-medium">{c.ai_score}%</span>
                      </div>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{format(new Date(c.applied_at), "d MMM yyyy", { locale: pt })}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => { e.stopPropagation(); deleteCandidate.mutate(c.id); }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
