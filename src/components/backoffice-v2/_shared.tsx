import { ReactNode } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

/* ────────── Page header com badge + título ────────── */
export function PageHeader({
  badge, title, subtitle, right,
}: { badge: ReactNode; title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600">
          {badge}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  );
}

/* ────────── KPI compacto (sem sparkline) ────────── */
export function StatTile({
  label, value, accent, icon: Icon,
}: { label: string; value: string | number; accent: string; icon: any }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4"
    >
      <div className={cn("grid h-10 w-10 place-items-center rounded-xl", accent)}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div className="min-w-0">
        <div className="text-[12px] font-medium text-slate-500">{label}</div>
        <div className="text-xl font-semibold tracking-tight text-slate-900">{value}</div>
      </div>
    </motion.div>
  );
}

/* ────────── Status pill consistente ────────── */
const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  trial: "bg-sky-50 text-sky-700 ring-sky-200",
  suspended: "bg-rose-50 text-rose-700 ring-rose-200",
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  inactive: "bg-slate-100 text-slate-600 ring-slate-200",
};
const STATUS_LABEL: Record<string, string> = {
  active: "Ativo",
  trial: "Trial",
  suspended: "Suspenso",
  pending: "Pendente",
  inactive: "Inativo",
};
export function StatusPill({ status }: { status?: string | null }) {
  const key = (status ?? "inactive").toLowerCase();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        STATUS_STYLES[key] ?? STATUS_STYLES.inactive
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {STATUS_LABEL[key] ?? status ?? "—"}
    </span>
  );
}

/* ────────── Banners de erro/fallback partilhados ────────── */
export function ErrorBanners({
  isError, error, partialErrors,
}: { isError: boolean; error?: unknown; partialErrors?: string[] }) {
  return (
    <>
      {isError && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <div className="font-medium">Falha ao carregar dados</div>
            <div className="text-xs text-rose-700/80">
              {(error as any)?.message ?? "Tenta novamente mais tarde."}
            </div>
          </div>
        </div>
      )}
      {partialErrors && partialErrors.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <div className="font-medium">Alguns dados ficaram em fallback</div>
            <div className="text-xs text-amber-800/80">
              Sem acesso a: {partialErrors.join(", ")}. Verifica RLS / permissões.
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ────────── Avatar inicial ────────── */
export function InitialsAvatar({
  name, email, src, size = 36,
}: { name?: string | null; email?: string | null; src?: string | null; size?: number }) {
  const base = (name ?? email ?? "?").trim();
  const initials = base
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const dim = { width: size, height: size };
  if (src) {
    return (
      <img
        src={src}
        alt={base}
        style={dim}
        className="rounded-full object-cover ring-1 ring-slate-200"
      />
    );
  }
  return (
    <div
      style={dim}
      className="grid place-items-center rounded-full bg-gradient-to-br from-[hsl(220,90%,56%)] to-[hsl(190,95%,50%)] text-[12px] font-semibold text-white"
    >
      {initials || "?"}
    </div>
  );
}

/* ────────── Skeleton de linha de tabela ────────── */
export function TableSkeleton({ cols, rows = 6 }: { cols: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="border-b border-slate-100">
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className="px-4 py-3">
              <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/* ────────── Empty state ────────── */
export function EmptyState({ icon: Icon, title, hint }: { icon: any; title: string; hint?: string }) {
  return (
    <div className="grid place-items-center gap-3 px-6 py-16 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-xl bg-slate-100">
        <Icon className="h-6 w-6 text-slate-400" />
      </div>
      <div className="text-sm font-medium text-slate-700">{title}</div>
      {hint && <div className="text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

export const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" }) : "—";
