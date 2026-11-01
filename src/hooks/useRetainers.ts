import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import { monthRange } from "@/lib/dates/monthRange";
import { lisbonDate, retainerInvoiceTag, type RetainerEntry, type RetainerInvoiceLine } from "@/lib/retainers/retainerUsage";

export interface ServiceRetainer {
  id: string;
  workspace_id: string;
  company_id: string | null;
  contract_id: string | null;
  name: string;
  monthly_fee: number;
  included_hours: number;
  overage_hourly_rate: number;
  start_date: string;
  end_date: string | null;
  status: "active" | "paused" | "ended";
  notes: string | null;
  created_at: string;
  companies?: { name: string } | null;
}

export type RetainerInput = Pick<ServiceRetainer, "name" | "company_id" | "monthly_fee" | "included_hours" | "overage_hourly_rate" | "start_date" | "status"> & { notes?: string | null; end_date?: string | null };

const KEY = "service-retainers";
const db = supabase as any;

export function useRetainers() {
  const { currentWorkspace: ws } = useWorkspace();
  return useQuery({
    queryKey: [KEY, ws?.id],
    enabled: !!ws?.id,
    queryFn: async () => {
      const { data, error } = await db.from("service_retainers")
        .select("*, companies(name)").eq("workspace_id", ws!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ServiceRetainer[];
    },
  });
}

export function useRetainer(id?: string) {
  return useQuery({
    queryKey: [KEY, "one", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await db.from("service_retainers").select("*, companies(name)").eq("id", id!).maybeSingle();
      if (error) throw error;
      return data as ServiceRetainer | null;
    },
  });
}

export function useSaveRetainer() {
  const { currentWorkspace: ws } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: RetainerInput }) => {
      if (!ws?.id) throw new Error("Sem espaço de trabalho");
      if (id) {
        const { error } = await db.from("service_retainers").update(input).eq("id", id);
        if (error) throw error;
        return id;
      }
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await db.from("service_retainers")
        .insert({ ...input, workspace_id: ws.id, created_by: user?.id ?? null }).select("id").single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => { toast.success("Avença guardada"); qc.invalidateQueries({ queryKey: [KEY] }); },
    onError: (e: any) => toast.error(e.message ?? "Erro ao guardar avença"),
  });
}

/** Registos de tempo (projetos + suporte) de uma avença num mês (Lisboa). */
export function useRetainerEntries(retainerId: string | undefined, monthKey: string) {
  return useQuery({
    queryKey: [KEY, "entries", retainerId, monthKey],
    enabled: !!retainerId,
    queryFn: async (): Promise<RetainerEntry[]> => {
      const [y, m] = monthKey.split("-").map(Number);
      const { from, to } = monthRange(y, m);
      // margem de 1 dia para converter instantes UTC para datas de Lisboa
      const fromTs = new Date(`${from}T00:00:00Z`); fromTs.setUTCDate(fromTs.getUTCDate() - 1);
      const toTs = new Date(`${to}T23:59:59Z`); toTs.setUTCDate(toTs.getUTCDate() + 1);
      const [proj, tick] = await Promise.all([
        db.from("implementation_time_entries")
          .select("id, project_id, task_id, user_id, entry_date, duration_minutes, billable, description, client_approval_status, client_note, implementation_projects(title), implementation_project_tasks(title)")
          .eq("retainer_id", retainerId).gte("entry_date", from).lte("entry_date", to).limit(5000),
        db.from("support_ticket_time_entries")
          .select("id, ticket_id, user_id, created_at, started_at, duration_minutes, description, client_approval_status, client_note, support_tickets(subject, ticket_number)")
          .eq("retainer_id", retainerId).gte("created_at", fromTs.toISOString()).lte("created_at", toTs.toISOString()).limit(5000),
      ]);
      if (proj.error) throw proj.error;
      if (tick.error) throw tick.error;
      const rows: RetainerEntry[] = [
        ...(proj.data ?? []).map((r: any) => ({
          id: r.id, source: "project" as const, date: r.entry_date, minutes: r.duration_minutes ?? 0,
          billable: r.billable !== false, description: r.description, userId: r.user_id,
          parentId: r.project_id, parentLabel: r.implementation_projects?.title ?? "Projeto",
          approval: r.client_approval_status ?? "submitted", clientNote: r.client_note, taskLabel: r.implementation_project_tasks?.title ?? null,
        })),
        ...(tick.data ?? []).map((r: any) => ({
          id: r.id, source: "ticket" as const, date: lisbonDate(r.started_at ?? r.created_at), minutes: r.duration_minutes ?? 0,
          billable: true, description: r.description, userId: r.user_id, parentId: r.ticket_id,
          approval: r.client_approval_status ?? "submitted", clientNote: r.client_note,
          parentLabel: r.support_tickets ? `${r.support_tickets.ticket_number ? `#${r.support_tickets.ticket_number} ` : ""}${r.support_tickets.subject ?? ""}` : "Ticket",
        })),
      ];
      return rows.filter((r) => r.date.slice(0, 7) === monthKey).sort((a, b) => b.date.localeCompare(a.date));
    },
  });
}

export function useProfileNames(userIds: string[]) {
  const ids = [...new Set(userIds.filter(Boolean))].sort();
  return useQuery({
    queryKey: ["profile-names", ids],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, full_name").in("user_id", ids);
      return new Map((data ?? []).map((p: any) => [p.user_id, p.full_name as string]));
    },
  });
}

/** Projetos e tickets ligados (e candidatos da mesma empresa/workspace). */
export function useRetainerLinks(retainer?: ServiceRetainer | null) {
  return useQuery({
    queryKey: [KEY, "links", retainer?.id],
    enabled: !!retainer?.id,
    queryFn: async () => {
      const [p, t] = await Promise.all([
        db.from("implementation_projects").select("id, title, status, retainer_id, company_id")
          .eq("workspace_id", retainer!.workspace_id).order("created_at", { ascending: false }).limit(500),
        db.from("support_tickets").select("id, subject, ticket_number, status, retainer_id, company_id")
          .eq("workspace_id", retainer!.workspace_id).order("created_at", { ascending: false }).limit(500),
      ]);
      if (p.error) throw p.error;
      if (t.error) throw t.error;
      return { projects: (p.data ?? []) as any[], tickets: (t.data ?? []) as any[] };
    },
  });
}

export function useLinkToRetainer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ kind, id, retainerId }: { kind: "project" | "ticket"; id: string; retainerId: string | null }) => {
      const table = kind === "project" ? "implementation_projects" : "support_tickets";
      const { error } = await db.from(table).update({ retainer_id: retainerId }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
    onError: (e: any) => toast.error(e.message ?? "Erro ao ligar"),
  });
}

/** Cria um projeto ou ticket novo já ligado à avença (mesmo workspace e empresa). */
export function useCreateRetainerWorkItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ retainer, kind, title }: { retainer: ServiceRetainer; kind: "project" | "ticket"; title: string }) => {
      const t = title.trim();
      if (t.length < 3 || t.length > 200) throw new Error("Indique um nome entre 3 e 200 caracteres");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sessão expirada");
      const base = { workspace_id: retainer.workspace_id, company_id: retainer.company_id, retainer_id: retainer.id };
      const res = kind === "project"
        ? await db.from("implementation_projects").insert({ ...base, title: t, created_by: user.id }).select("id").single()
        : await db.from("support_tickets").insert({ ...base, subject: t, created_by: user.id }).select("id").single();
      if (res.error) throw res.error;
      return res.data.id as string;
    },
    onSuccess: (_id, v) => { toast.success(v.kind === "project" ? "Projeto criado e ligado" : "Ticket criado e ligado"); qc.invalidateQueries({ queryKey: [KEY] }); },
    onError: (e: any) => toast.error(e.message ?? "Não foi possível criar"),
  });
}

export function useLogRetainerTime() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      retainer: ServiceRetainer; kind: "project" | "ticket"; parentId: string; taskId?: string | null;
      date: string; minutes: number; description: string; billable: boolean;
    }) => {
      if (input.minutes <= 0 || input.minutes > 24 * 60) throw new Error("Duração inválida (máx. 24h)");
      if (input.description.length > 2000) throw new Error("Descrição demasiado longa");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sessão expirada");
      const base = { workspace_id: input.retainer.workspace_id, user_id: user.id, retainer_id: input.retainer.id,
        duration_minutes: input.minutes, description: input.description.trim() || null };
      const res = input.kind === "project"
        ? await db.from("implementation_time_entries").insert({ ...base, project_id: input.parentId, task_id: input.taskId || null, entry_date: input.date, billable: input.billable, activity_type: "retainer" })
        : await db.from("support_ticket_time_entries").insert({ ...base, ticket_id: input.parentId, entry_type: "manual", started_at: `${input.date}T12:00:00Z`, hourly_rate: input.retainer.overage_hourly_rate });
      if (res.error) throw res.error;
    },
    onSuccess: () => { toast.success("Tempo registado"); qc.invalidateQueries({ queryKey: [KEY] }); qc.invalidateQueries({ queryKey: ["ticket-time-entries"] }); },
    onError: (e: any) => toast.error(e.message ?? "Erro ao registar tempo"),
  });
}

/** Corrige um registo de tempo existente (duração, data, descrição, faturável). */
export function useUpdateRetainerEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { source: "project" | "ticket"; id: string; date: string; minutes: number; description: string; billable: boolean }) => {
      if (input.minutes <= 0 || input.minutes > 24 * 60) throw new Error("Duração inválida (máx. 24h)");
      if (input.description.length > 2000) throw new Error("Descrição demasiado longa");
      const patch = input.source === "project"
        ? { entry_date: input.date, duration_minutes: input.minutes, description: input.description.trim() || null, billable: input.billable }
        : { started_at: `${input.date}T12:00:00Z`, duration_minutes: input.minutes, description: input.description.trim() || null };
      const table = input.source === "project" ? "implementation_time_entries" : "support_ticket_time_entries";
      const { data, error } = await db.from(table).update(patch).eq("id", input.id).select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("Sem permissão para alterar este registo");
    },
    onSuccess: () => { toast.success("Registo atualizado"); qc.invalidateQueries({ queryKey: [KEY] }); qc.invalidateQueries({ queryKey: ["ticket-time-entries"] }); },
    onError: (e: any) => toast.error(e.message ?? "Erro ao atualizar"),
  });
}

/** Avença ligada a um projeto ou ticket (para mostrar nas fichas). */
export function useRetainerBadge(kind: "project" | "ticket", parentId?: string | null) {
  return useQuery({
    queryKey: [KEY, "badge", kind, parentId],
    enabled: !!parentId,
    queryFn: async () => {
      const table = kind === "project" ? "implementation_projects" : "support_tickets";
      const { data: parent } = await db.from(table).select("retainer_id").eq("id", parentId!).maybeSingle();
      if (!parent?.retainer_id) return null;
      const { data } = await db.from("service_retainers").select("id, name").eq("id", parent.retainer_id).maybeSingle();
      return data as { id: string; name: string } | null;
    },
  });
}

export function useDeleteRetainerEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ source, id }: { source: "project" | "ticket"; id: string }) => {
      const table = source === "project" ? "implementation_time_entries" : "support_ticket_time_entries";
      const { error } = await db.from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Registo apagado"); qc.invalidateQueries({ queryKey: [KEY] }); },
    onError: (e: any) => toast.error(e.message ?? "Erro ao apagar"),
  });
}

/** Fatura do mês já criada para esta avença (pelo marcador nas notas). */
export function useRetainerMonthInvoice(retainerId?: string, monthKey?: string) {
  const { currentWorkspace: ws } = useWorkspace();
  return useQuery({
    queryKey: [KEY, "invoice", ws?.id, retainerId, monthKey],
    enabled: !!ws?.id && !!retainerId && !!monthKey,
    queryFn: async () => {
      const { data, error } = await db.from("invoices").select("id, invoice_number, status")
        .eq("workspace_id", ws!.id).ilike("notes", `%${retainerInvoiceTag(retainerId!, monthKey!)}%`)
        .order("created_at", { ascending: false }).limit(1);
      if (error) throw error;
      return (data?.[0] ?? null) as { id: string; invoice_number: string; status: string } | null;
    },
  });
}

/** Cria um RASCUNHO de fatura (nunca emitida) com mensalidade + horas extra do mês. */
export function useCreateRetainerDraftInvoice() {
  const { currentWorkspace: ws } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ retainer, monthKey, lines }: { retainer: ServiceRetainer; monthKey: string; lines: RetainerInvoiceLine[] }) => {
      if (!ws?.id || retainer.workspace_id !== ws.id) throw new Error("Workspace inválido");
      if (!retainer.company_id) throw new Error("A avença não tem empresa associada");
      if (lines.length === 0) throw new Error("Nada a faturar neste mês");
      const tag = retainerInvoiceTag(retainer.id, monthKey);
      const { data: existing, error: exErr } = await db.from("invoices").select("id, invoice_number")
        .eq("workspace_id", ws.id).ilike("notes", `%${tag}%`).limit(1);
      if (exErr) throw exErr;
      if (existing?.length) throw new Error(`Já existe a fatura ${existing[0].invoice_number} para este mês`);

      const { data: company, error: cErr } = await db.from("companies")
        .select("id, name, tax_id, email, preferred_contact_email, address, postal_code, city, country, workspace_id")
        .eq("id", retainer.company_id).maybeSingle();
      if (cErr) throw cErr;
      if (!company || company.workspace_id !== ws.id) throw new Error("Empresa não encontrada neste workspace");

      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sessão expirada");
      const { data: number, error: nErr } = await supabase.rpc("generate_invoice_number", { p_workspace_id: ws.id });
      if (nErr) throw nErr;

      const r2 = (n: number) => Math.round(n * 100) / 100;
      const items = lines.map((l, i) => {
        const net = r2(l.quantity * l.unit_price);
        const tax = r2(net * l.tax_rate / 100);
        return { description: l.description, quantity: l.quantity, unit_price: l.unit_price, discount_percent: 0, tax_rate: l.tax_rate, total: net, net_total: net, tax_amount: tax, gross_total: r2(net + tax), position: i };
      });
      const subtotal = r2(items.reduce((a, i) => a + i.net_total, 0));
      const taxAmount = r2(items.reduce((a, i) => a + i.tax_amount, 0));
      const today = lisbonDate(new Date().toISOString());
      const due = new Date(); due.setDate(due.getDate() + 30);
      const [y, m] = monthKey.split("-");

      const { data: inv, error: iErr } = await db.from("invoices").insert({
        workspace_id: ws.id, invoice_number: number as string, status: "draft",
        company_id: company.id, client_name: company.name,
        client_email: company.preferred_contact_email || company.email || null,
        client_tax_id: company.tax_id || null,
        client_address: [company.address, company.postal_code, company.city, company.country].filter(Boolean).join(", ") || null,
        issue_date: today, due_date: lisbonDate(due.toISOString()),
        subtotal, tax_rate: lines[0].tax_rate, tax_amount: taxAmount, discount_amount: 0, total: r2(subtotal + taxAmount), currency: "EUR",
        notes: `Avença ${retainer.name} — ${m}/${y}. Rascunho gerado a partir do extrato de horas. ${tag}`,
        created_by: u.user.id,
      }).select("id, invoice_number").single();
      if (iErr) throw iErr;
      const { error: itErr } = await db.from("invoice_items").insert(items.map((i) => ({ ...i, invoice_id: inv.id })));
      if (itErr) { await db.from("invoices").delete().eq("id", inv.id); throw itErr; }
      return inv as { id: string; invoice_number: string };
    },
    onSuccess: (inv) => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      toast.success(`Rascunho de fatura ${inv.invoice_number} criado`);
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível criar o rascunho"),
  });
}

/** Envia registos faturáveis do mês para aprovação do cliente no portal. */
export function useSendHoursForApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entries: RetainerEntry[]) => {
      const pick = (src: "project" | "ticket") => entries.filter((e) => e.source === src && e.billable && (e.approval === "submitted" || e.approval === "disputed" || !e.approval)).map((e) => e.id);
      const p = pick("project"), t = pick("ticket");
      if (!p.length && !t.length) throw new Error("Não há horas por enviar neste mês");
      const patch = { client_approval_status: "pending_client" };
      if (p.length) { const r = await db.from("implementation_time_entries").update(patch).in("id", p); if (r.error) throw r.error; }
      if (t.length) { const r = await db.from("support_ticket_time_entries").update(patch).in("id", t); if (r.error) throw r.error; }
      return p.length + t.length;
    },
    onSuccess: (n) => { toast.success(`${n} registos enviados ao cliente para aprovação`); qc.invalidateQueries({ queryKey: [KEY] }); },
    onError: (e: any) => toast.error(e.message ?? "Erro ao enviar"),
  });
}

/** Tarefas de um projeto (para escolher onde registar tempo). */
export function useProjectTasks(projectId: string | undefined) {
  return useQuery({
    queryKey: [KEY, "tasks", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await db.from("implementation_project_tasks").select("id, title, status").eq("project_id", projectId).order("sort_order").limit(500);
      if (error) throw error;
      return (data ?? []) as { id: string; title: string; status: string }[];
    },
  });
}

/** Abre um ticket de suporte a partir de uma tarefa (herda projeto, empresa e avença). */
export function useCreateTicketFromTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { task: { id: string; title: string; description?: string | null }; project: { id: string; workspace_id: string; company_id?: string | null; contact_id?: string | null; retainer_id?: string | null } }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sessão expirada");
      const { data, error } = await db.from("support_tickets").insert({
        workspace_id: input.project.workspace_id, subject: input.task.title.slice(0, 200),
        description: input.task.description ?? null, status: "open", priority: "medium",
        company_id: input.project.company_id ?? null, contact_id: input.project.contact_id ?? null,
        retainer_id: input.project.retainer_id ?? null, project_id: input.project.id, task_id: input.task.id, created_by: user.id,
      }).select("id").single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => { toast.success("Ticket criado a partir da tarefa"); qc.invalidateQueries({ queryKey: [KEY] }); qc.invalidateQueries({ queryKey: ["implementation-project"] }); },
    onError: (e: any) => toast.error(e.message ?? "Erro ao criar ticket"),
  });
}
