import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Send, StickyNote, AlertTriangle, Mail, Phone, Workflow, FileText } from "lucide-react";
import { useCollectionCase } from "../hooks/useCollectionCase";
import { useCaseActions } from "../hooks/useCaseActions";
import { StatusBadge } from "../components/StatusBadge";
import { CaseTimeline } from "../components/CaseTimeline";
import { SendActionDialog } from "../components/SendActionDialog";
import { AddNoteDialog } from "../components/AddNoteDialog";
import { PromisesPanel } from "../components/PromisesPanel";
import { AssignSequenceDialog } from "../components/AssignSequenceDialog";
import { SendStatementDialog } from "../components/SendStatementDialog";
import { formatEur } from "../lib/collectionsFormat";

export default function CollectionCaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: caseData, isLoading } = useCollectionCase(id);
  const { data: actions, isLoading: actionsLoading } = useCaseActions(id);
  const [sendOpen, setSendOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [statementOpen, setStatementOpen] = useState(false);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-4 p-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!caseData) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Button variant="ghost" onClick={() => navigate("/dashboard/collections")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <p className="mt-6 text-sm text-muted-foreground">Caso não encontrado.</p>
        </div>
      </DashboardLayout>
    );
  }

  const outstanding = caseData.total_due - caseData.total_paid;

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <Link to="/dashboard/collections" className="text-xs text-muted-foreground hover:underline">
              ← Cobranças
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">{caseData.debtor_name}</h1>
              <StatusBadge status={caseData.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              {caseData.debtor_type === "company" ? "Empresa" : "Contacto"}
              {caseData.debtor_tax_id ? ` · NIF ${caseData.debtor_tax_id}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setStatementOpen(true)}>
              <FileText className="h-4 w-4 mr-1" /> Enviar extrato
            </Button>
            <Button variant="outline" onClick={() => setSendOpen(true)}>
              <Send className="h-4 w-4 mr-1" /> Registar ação
            </Button>
            <Button variant="outline" onClick={() => setNoteOpen(true)}>
              <StickyNote className="h-4 w-4 mr-1" /> Adicionar nota
            </Button>
            <Button variant="outline" onClick={() => setAssignOpen(true)}>
              <Workflow className="h-4 w-4 mr-1" /> Sequência
            </Button>
            <Button variant="outline" disabled>
              <AlertTriangle className="h-4 w-4 mr-1" /> Escalar
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Kpi label="Em dívida" value={formatEur(outstanding)} />
              <Kpi label="Já pago" value={formatEur(caseData.total_paid)} />
              <Kpi label="Dias em atraso" value={String(caseData.days_overdue)} />
              <Kpi label="Faturas" value={String(caseData.invoices_count)} />
            </div>

            <Card>
              <CardHeader><CardTitle className="text-base">Faturas</CardTitle></CardHeader>
              <CardContent>
                {caseData.invoices.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem faturas associadas.</p>
                ) : (
                  <div className="divide-y">
                    {caseData.invoices.map((ci) => {
                      const inv = ci.invoice;
                      if (!inv) return null;
                      const remaining = Number(inv.total) - Number(inv.amount_paid ?? 0);
                      return (
                        <div key={ci.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                          <Link to={`/dashboard/invoices/${inv.id}`} className="font-medium hover:underline">
                            {inv.invoice_number}
                          </Link>
                          <span className="text-muted-foreground">Venc. {inv.due_date}</span>
                          <span>{formatEur(inv.total)}</span>
                          <span className="text-muted-foreground">Pago {formatEur(inv.amount_paid ?? 0)}</span>
                          <span className="font-medium">Em dívida {formatEur(remaining)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Histórico</CardTitle></CardHeader>
              <CardContent>
                <CaseTimeline actions={actions ?? []} isLoading={actionsLoading} />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Devedor</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="font-medium">{caseData.debtor_name}</div>
                {caseData.debtor_email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" /> {caseData.debtor_email}
                  </div>
                )}
                {caseData.debtor_phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" /> {caseData.debtor_phone}
                  </div>
                )}
                {caseData.company_id && (
                  <Link to={`/dashboard/companies/${caseData.company_id}`} className="text-xs text-primary hover:underline">
                    Ver no CRM →
                  </Link>
                )}
                {caseData.contact_id && !caseData.company_id && (
                  <Link to={`/dashboard/contacts/${caseData.contact_id}`} className="text-xs text-primary hover:underline">
                    Ver no CRM →
                  </Link>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Configuração</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <div>Sequência: <span className="text-foreground">{caseData.sequence_id ? `passo ${caseData.current_step_order ?? 0}` : "—"}</span></div>
                <div>Próxima ação: <span className="text-foreground">{caseData.next_action_at ? new Date(caseData.next_action_at).toLocaleString("pt-PT") : "—"}</span></div>
                <div>Prioridade: <span className="text-foreground">{caseData.priority}</span></div>
                <div>Responsável: <span className="text-foreground">{caseData.assigned_to ?? "—"}</span></div>
              </CardContent>
            </Card>

            <PromisesPanel caseId={caseData.id} outstanding={outstanding} />
          </div>
        </div>
      </div>

      <SendActionDialog open={sendOpen} onOpenChange={setSendOpen} caseId={caseData.id} />
      <AddNoteDialog open={noteOpen} onOpenChange={setNoteOpen} caseId={caseData.id} />
      <AssignSequenceDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        caseId={caseData.id}
        currentSequenceId={caseData.sequence_id}
      />
      <SendStatementDialog
        open={statementOpen}
        onOpenChange={setStatementOpen}
        caseId={caseData.id}
        workspaceId={caseData.workspace_id}
        companyId={caseData.company_id}
        contactId={caseData.contact_id}
        debtorName={caseData.debtor_name}
        debtorEmail={caseData.debtor_email}
        debtorPhone={caseData.debtor_phone}
      />
    </DashboardLayout>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-1 text-xl font-semibold tracking-tight">{value}</div>
      </CardContent>
    </Card>
  );
}
