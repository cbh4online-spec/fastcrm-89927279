import { ReactNode } from "react";
import { Sparkles, TrendingUp, ShieldCheck, MessageCircle, FileCheck2 } from "lucide-react";
import { FastCRMLogo } from "@/components/brand/FastCRMLogo";

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
}

const KPIS = [
  { label: "Conversão do funil", value: "38%", width: "38%", icon: TrendingUp },
  { label: "Conformidade SAF-T", value: "100%", width: "100%", icon: FileCheck2 },
  { label: "WhatsApp Pro ativo", value: "99,8%", width: "99.8%", icon: MessageCircle },
];

const RADAR_NODES = [
  { top: "18%", left: "62%" },
  { top: "34%", left: "28%" },
  { top: "58%", left: "72%" },
  { top: "70%", left: "38%" },
  { top: "46%", left: "50%" },
];

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex bg-background">
      {/* Formulário */}
      <div className="w-full lg:w-[38%] flex flex-col justify-between p-6 sm:p-10 bg-background">
        <FastCRMLogo variant="full" size="lg" />

        <div className="w-full max-w-sm mx-auto py-10 space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
            <p className="mt-2 text-muted-foreground">{subtitle}</p>
          </div>
          {children}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>© 2026 FastCRM</span>
          <a href="/privacy" className="hover:text-foreground">Privacidade</a>
          <a href="/terms" className="hover:text-foreground">Termos</a>
          <a href="/pricing" className="hover:text-foreground">Ver planos</a>
        </div>
      </div>

      {/* Montra */}
      <div className="hidden lg:flex lg:w-[62%] relative overflow-hidden gradient-primary p-12 flex-col justify-between text-primary-foreground">
        <div
          aria-hidden
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--primary-foreground) / 0.25) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary-foreground) / 0.25) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />

        <div className="relative flex items-center justify-between">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/30 bg-primary-foreground/10 px-4 py-1.5 text-xs font-medium backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-foreground opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary-foreground" />
            </span>
            FastCRM Core · Motor de vendas ativo
          </span>
        </div>

        <div className="relative grid grid-cols-2 gap-6 items-center my-10">
          {/* Radar do pipeline */}
          <div className="relative aspect-square max-w-xs w-full mx-auto">
            {[100, 72, 44].map((s) => (
              <div
                key={s}
                className="absolute rounded-full border border-primary-foreground/30"
                style={{ inset: `${(100 - s) / 2}%` }}
              />
            ))}
            <div className="absolute inset-0 rounded-full animate-[spin_8s_linear_infinite]"
              style={{ background: "conic-gradient(from 0deg, hsl(var(--primary-foreground) / 0.25), transparent 25%)" }}
            />
            {RADAR_NODES.map((n, i) => (
              <span
                key={i}
                className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-foreground shadow-[0_0_12px_hsl(var(--primary-foreground))]"
                style={{ top: n.top, left: n.left }}
              />
            ))}
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-primary-foreground/20 bg-primary-foreground/10 p-5 backdrop-blur">
              <p className="text-[11px] uppercase tracking-wider text-primary-foreground/70 mb-4">Indicadores comerciais</p>
              <div className="space-y-4">
                {KPIS.map(({ label, value, width, icon: Icon }) => (
                  <div key={label}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2"><Icon className="h-4 w-4" />{label}</span>
                      <span className="font-bold tabular-nums">{value}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-primary-foreground/20">
                      <div className="h-full rounded-full bg-primary-foreground" style={{ width }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-primary-foreground/20 bg-primary-foreground/10 p-4 backdrop-blur flex items-center gap-3">
              <ShieldCheck className="h-8 w-8 shrink-0" />
              <div>
                <p className="text-sm font-semibold">Proposta aceite · 4.850,00 €</p>
                <p className="text-xs text-primary-foreground/70">Exemplo de negócio fechado</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative space-y-5 max-w-2xl">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground/80">
            <Sparkles className="h-4 w-4" /> Plataforma de vendas e faturação com IA
          </p>
          <h2 className="text-4xl xl:text-5xl font-bold leading-tight">
            Feche negócios e fature mais rápido do que nunca.
          </h2>
          <p className="text-lg text-primary-foreground/85">
            Pipeline inteligente, WhatsApp Pro, faturação SAF-T e gestão de cobranças num só ecossistema.
          </p>
          <div className="flex gap-10 pt-2">
            {[["+500", "empresas"], ["SAF-T", "exportação AT"], ["24/7", "automação"]].map(([v, l]) => (
              <div key={l}>
                <p className="text-2xl font-bold">{v}</p>
                <p className="text-xs uppercase tracking-wider text-primary-foreground/70">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
