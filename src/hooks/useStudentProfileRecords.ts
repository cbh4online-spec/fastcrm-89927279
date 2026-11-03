import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

const db = supabase as any;

/** Permissão financeira da Jornada (mesma função usada pela RLS). */
export function useSjFinanceAccess() {
  const { currentWorkspace } = useWorkspace();
  const ws = currentWorkspace?.id;
  return useQuery({
    queryKey: ["sj-finance-access", ws],
    enabled: !!ws,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await db.rpc("sj_has_any_role", { _workspace_id: ws, _roles: ["gestao", "financeiro"] });
      if (error) return false; // fail-closed
      return data === true;
    },
  });
}

export function useSjAttendance(enrollmentIds: string[]) {
  const { currentWorkspace } = useWorkspace();
  const ws = currentWorkspace?.id;
  return useQuery({
    queryKey: ["sj-attendance", ws, enrollmentIds],
    enabled: !!ws && enrollmentIds.length > 0,
    queryFn: async () => {
      const { data, error } = await db
        .from("sj_attendance")
        .select("id, enrollment_id, session_date, present, hours_attended, notes")
        .eq("workspace_id", ws)
        .in("enrollment_id", enrollmentIds)
        .order("session_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as { id: string; enrollment_id: string; session_date: string; present: boolean; hours_attended: number; notes: string | null }[];
    },
  });
}

export function useSjCertificates(enrollmentIds: string[]) {
  const { currentWorkspace } = useWorkspace();
  const ws = currentWorkspace?.id;
  return useQuery({
    queryKey: ["sj-certificates", ws, enrollmentIds],
    enabled: !!ws && enrollmentIds.length > 0,
    queryFn: async () => {
      const { data, error } = await db
        .from("sj_certificates")
        .select("id, enrollment_id, status, evaluation, issued_at, document_url")
        .eq("workspace_id", ws)
        .in("enrollment_id", enrollmentIds);
      if (error) throw error;
      return (data ?? []) as { id: string; enrollment_id: string; status: string; evaluation: string | null; issued_at: string | null; document_url: string | null }[];
    },
  });
}

export interface SjInstallmentRow {
  id: string; enrollment_id: string; installment_no: number; amount: number;
  due_date: string; paid_amount: number; paid_at: string | null;
}
export interface SjInvoiceLinkRow {
  enrollment_id: string; invoice_id: string; allocated_amount: number | null;
  invoice_total: number; invoice_status: string | null; invoice_number: string | null;
}

/** Só corre com permissão financeira; a RLS volta a validar no servidor. */
export function useSjEnrollmentFinance(enrollmentIds: string[], allowed: boolean) {
  const { currentWorkspace } = useWorkspace();
  const ws = currentWorkspace?.id;
  return useQuery({
    queryKey: ["sj-enrollment-finance", ws, enrollmentIds],
    enabled: !!ws && allowed && enrollmentIds.length > 0,
    queryFn: async () => {
      const [inst, links] = await Promise.all([
        db.from("sj_installments")
          .select("id, enrollment_id, installment_no, amount, due_date, paid_amount, paid_at")
          .eq("workspace_id", ws).in("enrollment_id", enrollmentIds).order("installment_no"),
        db.from("sj_enrollment_invoices")
          .select("enrollment_id, invoice_id, allocated_amount")
          .eq("workspace_id", ws).in("enrollment_id", enrollmentIds),
      ]);
      if (inst.error) throw inst.error;
      if (links.error) throw links.error;
      const ids = [...new Set((links.data ?? []).map((l: any) => l.invoice_id))];
      let invMap = new Map<string, any>();
      if (ids.length) {
        const { data, error } = await db.from("invoices")
          .select("id, total, status, invoice_number").eq("workspace_id", ws).in("id", ids);
        if (error) throw error;
        invMap = new Map((data ?? []).map((i: any) => [i.id, i]));
      }
      const invoices: SjInvoiceLinkRow[] = (links.data ?? []).map((l: any) => {
        const inv = invMap.get(l.invoice_id);
        return {
          enrollment_id: l.enrollment_id, invoice_id: l.invoice_id,
          allocated_amount: l.allocated_amount == null ? null : Number(l.allocated_amount),
          invoice_total: Number(inv?.total ?? 0), invoice_status: inv?.status ?? "void",
          invoice_number: inv?.invoice_number ?? null,
        };
      });
      const installments: SjInstallmentRow[] = (inst.data ?? []).map((i: any) => ({
        ...i, amount: Number(i.amount), paid_amount: Number(i.paid_amount),
      }));
      return { installments, invoices };
    },
  });
}
