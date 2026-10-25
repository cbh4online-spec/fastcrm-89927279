import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { Search, ArrowUpRight, Loader2, Phone } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { useCapability } from "@/hooks/useCapability";
import { LOOKUP_LIMIT, normalizeLookupPhone, queryLookup } from "./lookup";

type Contact = { id: string; workspace_id: string; name: string; phone: string | null; whatsapp_number: string | null; company: string | null };
type Lead = { id: string; workspace_id: string; name: string; phone: string | null; status: string | null };
const statuses: Record<string, string> = { new: "Novo", contacted: "Contactado", qualified: "Qualificado", converted: "Convertido", lost: "Perdido", nurturing: "Em acompanhamento", unqualified: "Não qualificado" };
const LOOKUP_PATH = "/dashboard/whatsapp-pro/lookup";

export default function WhatsAppProContactLookup() {
  const { user, loading } = useAuth();
  const { currentWorkspace, loading: workspaceLoading } = useWorkspace();
  const canRead = useCapability("crm.read");
  if (loading) return <p role="status" className="p-6 text-muted-foreground">A carregar sessão…</p>;
  if (!user) return <Navigate to={`/auth?redirect=${encodeURIComponent(LOOKUP_PATH)}`} replace />;
  if (workspaceLoading) return <p role="status" className="p-6 text-muted-foreground">A carregar workspace…</p>;
  if (!currentWorkspace) return <p role="alert" className="p-6 text-destructive">Não foi possível obter o workspace atual.</p>;
  if (!canRead) return <p role="alert" className="p-6 text-destructive">Não tem permissão para consultar o CRM.</p>;
  return <DashboardLayout><LookupForm key={`${user.id}:${currentWorkspace.id}`} workspaceId={currentWorkspace.id} workspaceName={currentWorkspace.name} /></DashboardLayout>;
}

function LookupForm({ workspaceId, workspaceName }: { workspaceId: string; workspaceName: string }) {
  const { workspaceClient, instanceData, isLoading, error, workspaceStatus } = useWorkspaceInstance();
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [results, setResults] = useState<{ contacts: Contact[]; leads: Lead[]; contactsError: boolean; leadsError: boolean } | null>(null);
  const request = useRef<AbortController | null>(null);
  const blocked = isLoading || Boolean(error) || workspaceStatus !== "active" || Boolean(instanceData && instanceData.workspace_id !== workspaceId);

  useEffect(() => {
    request.current?.abort();
    request.current = null;
    setResults(null);
    setPhone("");
    setMessage("");
    setBusy(false);
    return () => { request.current?.abort(); request.current = null; };
  }, [workspaceClient, blocked]);

  function resetSearch(value: string) {
    request.current?.abort();
    request.current = null;
    setPhone(value);
    setResults(null);
    setMessage("");
    setBusy(false);
  }

  async function search(event: FormEvent) {
    event.preventDefault();
    if (blocked || busy) return;
    const normalized = normalizeLookupPhone(phone);
    if (!normalized) { setMessage("Introduza um número português de 9 dígitos (2, 3 ou 9) ou um número internacional com + ou 00."); return; }
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    setBusy(true);
    setResults(null);
    setMessage("");
    try {
      const response = await queryLookup(workspaceClient, workspaceId, normalized, controller.signal);
      if (request.current !== controller || controller.signal.aborted) return;
      setResults({
        contacts: response.contacts.error ? [] : (response.contacts.data ?? []).filter(row => row.workspace_id === workspaceId),
        leads: response.leads.error ? [] : (response.leads.data ?? []).filter(row => row.workspace_id === workspaceId),
        contactsError: Boolean(response.contacts.error), leadsError: Boolean(response.leads.error),
      });
    } catch {
      if (request.current === controller && !controller.signal.aborted) setMessage("Não foi possível pesquisar. Tente novamente.");
    } finally {
      window.clearTimeout(timeout);
      if (request.current === controller) {
        if (controller.signal.aborted) setMessage("A pesquisa foi interrompida. Tente novamente.");
        setBusy(false);
      }
    }
  }

  return <div className="mx-auto max-w-4xl space-y-8 ph-no-capture ph-mask sentry-block" data-sentry-block>
    <header className="space-y-2 border-b pb-6">
      <h1 className="flex items-center gap-3 text-2xl font-semibold"><Phone className="h-6 w-6 shrink-0 text-primary" />Pesquisar contacto</h1>
      <p className="break-words text-muted-foreground">{workspaceName} · FastCRM WhatsApp Pro</p>
    </header>
    <form onSubmit={search} className="space-y-3" noValidate autoComplete="off">
      <Label htmlFor="lookup-phone">Número de telefone</Label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input id="lookup-phone" type="tel" inputMode="tel" autoComplete="off" maxLength={40} value={phone} onChange={event => resetSearch(event.target.value)} placeholder="912 345 678 ou +351 912 345 678" aria-describedby="lookup-message" aria-invalid={Boolean(message)} disabled={blocked} className="ph-no-capture ph-mask" data-private />
        <Button type="submit" disabled={blocked || busy} className="shrink-0">{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" /> : <Search className="mr-2 h-4 w-4" />}Pesquisar</Button>
      </div>
      <div id="lookup-message" role={message ? "alert" : "status"} aria-live="polite" className="text-sm text-muted-foreground">
        {blocked ? (isLoading ? "A preparar workspace…" : "A pesquisa está indisponível neste workspace. Não foi feita nenhuma consulta.") : message || (busy ? "A pesquisar…" : "")}
      </div>
    </form>
    {results && <div aria-live="polite" className="grid gap-8 md:grid-cols-2">
      <ResultList title="Contactos" rows={results.contacts} failed={results.contactsError} kind="contacts" />
      <ResultList title="Leads" rows={results.leads} failed={results.leadsError} kind="leads" />
    </div>}
    {results && <p className="text-sm text-muted-foreground">A ausência de resultados não confirma que o número não exista: formatos guardados com espaços ou separadores podem não corresponder.</p>}
  </div>;
}

function ResultList({ title, rows, failed, kind }: { title: string; rows: (Contact | Lead)[]; failed: boolean; kind: "contacts" | "leads" }) {
  return <section className="min-w-0 space-y-4">
    <h2 className="text-lg font-semibold">{title} {failed ? "" : `(${rows.length})`}</h2>
    {failed ? <p role="alert" className="text-sm text-destructive">Não foi possível consultar {title.toLowerCase()}. Volte a pesquisar.</p> : rows.length === 0 ? <p className="text-sm text-muted-foreground">Sem correspondências nos formatos pesquisados.</p> : <ul className="divide-y">
      {rows.map(row => <li key={row.id} className="space-y-3 py-4">
        <div className="min-w-0 space-y-1 break-words">
          <h3 className="font-medium">{row.name}</h3>
          {"company" in row && row.company && <p className="text-sm text-muted-foreground">{row.company}</p>}
          {"status" in row && row.status && <p className="text-sm text-muted-foreground">{statuses[row.status] ?? row.status}</p>}
          <p className="text-sm">{row.phone || ("whatsapp_number" in row ? row.whatsapp_number : null)}</p>
        </div>
        <Button asChild variant="outline" size="sm"><Link to={`/dashboard/${kind}/${encodeURIComponent(row.id)}`}>Abrir ficha<ArrowUpRight className="ml-2 h-4 w-4" /></Link></Button>
      </li>)}
    </ul>}
    {rows.length === LOOKUP_LIMIT && <p className="text-sm text-muted-foreground">Limite de {LOOKUP_LIMIT} resultados atingido; poderão existir mais correspondências.</p>}
  </section>;
}