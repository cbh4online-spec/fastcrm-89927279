import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useSjFinanceAccess } from "@/hooks/useStudentProfileRecords";
import { lisbonTodayYmd } from "@/lib/dates/lisbonDays";

const db = supabase as any;

function addDays(ymd: string, n: number) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** Alerta de prestações a vencer nos próximos 7 dias (calendário de Lisboa). Só para quem tem acesso financeiro. */
export function DueSoonAlert() {
  const { currentWorkspace } = useWorkspace();
  const ws = currentWorkspace?.id;
  const access = useSjFinanceAccess();
  const today = lisbonTodayYmd();
  const q = useQuery({
    queryKey: ["sj-due-soon", ws, today],
    enabled: !!ws && access.data === true,
    queryFn: async () => {
      const { data, error } = await db.from("sj_installments").select("amount, paid_amount")
        .eq("workspace_id", ws).gte("due_date", today).lte("due_date", addDays(today, 7)).limit(1000);
      if (error) throw error;
      return (data ?? []).filter((i: any) => Number(i.paid_amount) < Number(i.amount)).length;
    },
  });
  if (!q.data) return null;
  return (
    <Link to="/dashboard/student-journey/finance?view=due7"
      className="flex items-center gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm hover:bg-warning/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <AlertTriangle className="h-4 w-4 text-warning" aria-hidden />
      {q.data} {q.data === 1 ? "prestação vence" : "prestações vencem"} nos próximos 7 dias. Ver lista
    </Link>
  );
}
