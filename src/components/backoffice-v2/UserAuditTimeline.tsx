import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  History, Loader2, ShieldAlert, AlertCircle, UserX, UserCheck,
  Globe2, Monitor,
} from "lucide-react";
import { useUserAuditLog, type UserAuditEntry } from "@/hooks/useUserAuditLog";
import { EmptyState, fmtDate } from "./_shared";

type ActionMeta = {
  label: string;
  icon: any;
  tone: "warning" | "success" | "info";
};

const ACTION_META: Record<string, ActionMeta> = {
  deactivate_user: { label: "Suspendeu o acesso", icon: UserX, tone: "warning" },
  reactivate_user: { label: "Reativou o acesso", icon: UserCheck, tone: "success" },
};

const TONE_STYLES: Record<ActionMeta["tone"], string> = {
  warning: "bg-amber-50 text-amber-700 ring-amber-200",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  info: "bg-brand/10 text-brand ring-brand/20",
};

export function UserAuditTimeline({ targetUserId }: { targetUserId: string }) {
  const { data, isLoading, isError, error } = useUserAuditLog(targetUserId);
  const entries = useMemo(() => data ?? [], [data]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-navy-100 bg-white p-8 text-sm text-navy-500">
        <Loader2 className="h-4 w-4 animate-spin" /> A carregar histórico…
      </div>
    );
  }
  if (isError) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50/60 p-4 text-sm text-rose-700">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <div className="font-medium">Não foi possível carregar o histórico.</div>
          <div className="mt-0.5 text-xs text-rose-600/80">{(error as any)?.message}</div>
        </div>
      </div>
    );
  }
  if (entries.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="Sem histórico administrativo."
        hint="As ações administrativas executadas sobre este utilizador aparecerão aqui."
      />
    );
  }

  return (
    <ol className="relative space-y-3 border-l border-navy-100 pl-5">
      {entries.map((e, i) => (
        <AuditItem key={e.id} entry={e} index={i} />
      ))}
    </ol>
  );
}

function AuditItem({ entry, index }: { entry: UserAuditEntry; index: number }) {
  const meta = ACTION_META[entry.action_type] ?? {
    label: entry.action_type,
    icon: ShieldAlert,
    tone: "info" as const,
  };
  const Icon = meta.icon;
  const reason = entry.details?.reason ?? null;
  const before = entry.details?.before ?? null;
  const after = entry.details?.after ?? null;
  const actorEmail = entry.details?.actor_email ?? null;

  const stateChange = describeStateChange(before, after);

  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.18) }}
      className="relative"
    >
      <span
        className={`absolute -left-[27px] top-1.5 grid h-5 w-5 place-items-center rounded-full ring-4 ring-white ${TONE_STYLES[meta.tone]}`}
      >
        <Icon className="h-3 w-3" />
      </span>
      <div className="rounded-xl border border-navy-100 bg-white p-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-display text-sm font-semibold text-navy">{meta.label}</div>
            <div className="mt-0.5 text-xs text-navy-300">
              {actorEmail ?? "—"} · {fmtDate(entry.created_at)}
            </div>
          </div>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ${TONE_STYLES[meta.tone]}`}
          >
            {meta.tone === "warning" ? "Atenção" : meta.tone === "success" ? "OK" : "Info"}
          </span>
        </div>

        {reason && (
          <div className="mt-2 rounded-lg border border-navy-100 bg-brand-ice/40 px-3 py-2 text-xs leading-relaxed text-navy-500">
            <span className="font-semibold text-navy">Motivo:</span> {reason}
          </div>
        )}

        {stateChange.length > 0 && (
          <ul className="mt-2 space-y-1 text-xs text-navy-500">
            {stateChange.map((s) => (
              <li key={s.key}>
                <span className="font-medium text-navy">{s.label}:</span>{" "}
                <span className="text-navy-300 line-through">{s.from}</span>{" "}
                <span className="text-navy-300">→</span>{" "}
                <span className="font-medium text-navy">{s.to}</span>
              </li>
            ))}
          </ul>
        )}

        {(entry.ip_address || entry.user_agent) && (
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10.5px] text-navy-300">
            {entry.ip_address && (
              <span className="inline-flex items-center gap-1">
                <Globe2 className="h-3 w-3" /> {entry.ip_address}
              </span>
            )}
            {entry.user_agent && (
              <span className="inline-flex items-center gap-1 truncate" title={entry.user_agent}>
                <Monitor className="h-3 w-3" /> {truncateUA(entry.user_agent)}
              </span>
            )}
          </div>
        )}
      </div>
    </motion.li>
  );
}

function describeStateChange(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): { key: string; label: string; from: string; to: string }[] {
  if (!before || !after) return [];
  const labels: Record<string, string> = {
    status: "Estado",
  };
  const out: { key: string; label: string; from: string; to: string }[] = [];
  for (const key of Object.keys(after)) {
    if (!(key in labels)) continue;
    const a = (after as any)[key];
    const b = (before as any)[key];
    if (String(a ?? "") !== String(b ?? "")) {
      out.push({
        key,
        label: labels[key],
        from: b == null || b === "" ? "—" : String(b),
        to: a == null || a === "" ? "—" : String(a),
      });
    }
  }
  return out;
}

function truncateUA(ua: string): string {
  if (ua.length <= 60) return ua;
  return ua.slice(0, 57) + "…";
}
