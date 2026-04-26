import { ReactNode } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { EASE_PREMIUM as EASE, staggerContainer, staggerItem } from "@/lib/motion";

/* ────────── Page header com badge + título ────────── */
export function PageHeader({
  badge, title, subtitle, right,
}: { badge: ReactNode; title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
      className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"
    >
      <div>
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-navy-100 bg-white px-2.5 py-1 text-[11px] font-medium text-navy-500 shadow-[0_1px_2px_rgba(11,29,61,0.04)]">
          {badge}
        </div>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-navy md:text-[34px]">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-navy-500">{subtitle}</p>}
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </motion.div>
  );
}

/* ────────── KPI compacto (sem sparkline) ────────── */
export function StatTile({
  label, value, accent, icon: Icon,
}: { label: string; value: string | number; accent: string; icon: any }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
      className="group flex items-center gap-3 rounded-2xl border border-navy-100 bg-white p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_50px_-25px_hsl(218_70%_14%/0.16)]"
    >
      <div className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white shadow-[0_8px_20px_-10px_rgba(11,29,61,0.35)]", accent)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-navy-300">{label}</div>
        <div className="font-display text-xl font-semibold tracking-tight text-navy tabular-nums">{value}</div>
      </div>
    </motion.div>
  );
}

/* ────────── Status pill consistente ────────── */
const STATUS_STYLES: Record<string, string> = {
  active: "bg-success/10 text-success ring-success/20",
  trial: "bg-cyan/10 text-cyan ring-cyan/30",
  suspended: "bg-destructive/10 text-destructive ring-destructive/20",
  pending: "bg-warning/15 text-warning-foreground ring-warning/30",
  inactive: "bg-navy-100 text-navy-500 ring-navy-200",
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
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
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
        <motion.div
          initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive"
        >
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <div className="font-semibold">Falha ao carregar dados</div>
            <div className="text-xs opacity-80">
              {(error as any)?.message ?? "Tenta novamente mais tarde."}
            </div>
          </div>
        </motion.div>
      )}
      {partialErrors && partialErrors.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning-foreground"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <div className="font-semibold">Alguns dados ficaram em fallback</div>
            <div className="text-xs opacity-80">
              Sem acesso a: {partialErrors.join(", ")}. Verifica RLS / permissões.
            </div>
          </div>
        </motion.div>
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
        className="rounded-full object-cover ring-2 ring-white shadow-[0_2px_8px_rgba(11,29,61,0.12)]"
      />
    );
  }
  return (
    <div
      style={dim}
      className="grid place-items-center rounded-full bg-gradient-to-br from-brand to-cyan text-[12px] font-semibold text-white shadow-[0_4px_12px_-4px_hsl(218_100%_54%/0.45)]"
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
        <tr key={r} className="border-b border-navy-100/60">
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className="px-4 py-4">
              <div
                className="h-3 w-full overflow-hidden rounded bg-navy-100/70"
                style={{
                  background:
                    "linear-gradient(90deg, hsl(214 40% 92% / 0.6) 0%, hsl(214 40% 97%) 50%, hsl(214 40% 92% / 0.6) 100%)",
                  backgroundSize: "200% 100%",
                  animation: "shimmer 1.4s ease-in-out infinite",
                }}
              />
            </td>
          ))}
        </tr>
      ))}
      <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
    </>
  );
}

/* ────────── Empty state ────────── */
export function EmptyState({ icon: Icon, title, hint }: { icon: any; title: string; hint?: string }) {
  return (
    <div className="grid place-items-center gap-3 px-6 py-16 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-ice ring-1 ring-navy-100">
        <Icon className="h-6 w-6 text-navy-300" />
      </div>
      <div className="font-display text-base font-semibold text-navy">{title}</div>
      {hint && <div className="max-w-xs text-xs text-navy-500">{hint}</div>}
    </div>
  );
}

export const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" }) : "—";
