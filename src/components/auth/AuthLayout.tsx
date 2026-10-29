import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Sparkles, Radar, PlayCircle } from "lucide-react";
import { FastCRMLogo } from "@/components/brand/FastCRMLogo";
import heroImg from "@/assets/auth-hero.jpg";

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
}

const KPIS = [
  { label: "CONVERSÃO", value: 38, state: "Equilibrado" },
  { label: "COBRANÇA", value: 18, state: "Baixo risco" },
  { label: "PIPELINE", value: 76, state: "Atenção" },
];

const NODES = [
  { top: "28%", left: "62%", c: "bg-emerald-400" },
  { top: "36%", left: "30%", c: "bg-emerald-400" },
  { top: "48%", left: "52%", c: "bg-sky-400" },
  { top: "60%", left: "72%", c: "bg-amber-400" },
  { top: "70%", left: "40%", c: "bg-emerald-400" },
];

const STEPS = ["PIPELINE · OPORTUNIDADES", "WHATSAPP PRO", "FATURAÇÃO SAF-T"];

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="dark min-h-screen flex bg-[hsl(var(--auth-surface))] text-foreground">
      {/* Formulário */}
      <div className="relative w-full lg:w-[38%] flex flex-col bg-gradient-to-b from-[hsl(var(--auth-surface-2))] to-[hsl(var(--auth-surface))]">
        <div className="lg:hidden h-32 bg-cover bg-center opacity-60" style={{ backgroundImage: `url(${heroImg})` }} />
        <div className="flex-1 flex items-center justify-center px-6 py-10 sm:px-12">
          <div className="w-full max-w-md space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-card/90 px-3 py-2 ring-1 ring-border">
                  <FastCRMLogo variant="full" size="md" />
                </div>
              </div>
              <span className="text-xs text-muted-foreground">PT</span>
            </div>
            <p className="text-[11px] tracking-[0.3em] text-muted-foreground">CRM · VENDAS COM IA</p>
            <div>
              <h1 className="auth-serif text-5xl font-medium leading-tight">{title}</h1>
              <p className="mt-3 text-muted-foreground">{subtitle}</p>
            </div>
            {children}
            <div className="flex justify-center gap-5 pt-2 border-t border-border text-sm text-muted-foreground">
              <Link to="/pricing" className="pt-4 hover:text-foreground">Ver planos</Link>
              <Link to="/features" className="pt-4 inline-flex items-center gap-1.5 hover:text-foreground">
                <PlayCircle className="h-4 w-4" /> Ver funcionalidades
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Montra */}
      <div className="hidden lg:block lg:w-[62%] relative overflow-hidden">
        <img src={heroImg} alt="" width={1600} height={1200} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-[hsl(var(--auth-surface)/0.7)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--auth-surface))] via-transparent to-[hsl(var(--auth-surface)/0.6)]" />

        <div className="relative h-full flex flex-col p-10 xl:p-14">
          <span className="self-start inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/30 px-4 py-2 text-sm backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <Radar className="h-4 w-4" /> FastCRM Core · Motor de vendas ativo
          </span>

          {/* Cartão índices */}
          <div className="absolute right-10 top-24 w-72 rounded-2xl border border-border/60 bg-card/40 p-6 backdrop-blur-md">
            <p className="text-[11px] tracking-[0.25em] text-muted-foreground mb-5">INDICADORES COMERCIAIS</p>
            <div className="space-y-5">
              {KPIS.map((k) => (
                <div key={k.label}>
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-semibold">{k.label}</span>
                    <span className="auth-serif text-2xl">{k.value}</span>
                  </div>
                  <div className="mt-1.5 h-1 rounded-full bg-muted">
                    <div className="h-full rounded-full bg-[hsl(var(--auth-accent))]" style={{ width: `${k.value}%` }} />
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">{k.state}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Retículo */}
          <div className="absolute left-[28%] top-[12%] h-72 w-72 rounded-full border border-[hsl(var(--auth-accent)/0.5)] shadow-[0_0_60px_hsl(var(--auth-accent)/0.35)]">
            <div className="absolute inset-6 rounded-full border border-dashed border-border/50" />
            <div className="absolute left-1/2 top-0 h-full w-px bg-border/50" />
            <div className="absolute top-1/2 left-0 w-full h-px bg-border/50" />
            {NODES.map((n, i) => (
              <span key={i} className={`absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-background ${n.c}`} style={{ top: n.top, left: n.left }} />
            ))}
          </div>

          <div className="mt-auto space-y-10">
            <ol className="space-y-3 text-xs tracking-[0.25em]">
              {STEPS.map((s, i) => (
                <li key={s} className={`flex items-center gap-3 ${i === 0 ? "text-foreground" : "text-muted-foreground/70"}`}>
                  <span className="text-[hsl(var(--auth-accent))]">0{i + 1}</span>
                  <span className="h-px w-6 bg-border" /> {s}
                </li>
              ))}
            </ol>

            <div className="max-w-2xl space-y-5">
              <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.3em] text-[hsl(var(--auth-accent))]">
                <Sparkles className="h-4 w-4" /> VENDAS E FATURAÇÃO COM INTELIGÊNCIA ARTIFICIAL
              </p>
              <h2 className="auth-serif text-6xl leading-[1.05]">Feche negócios como nunca fechou.</h2>
              <p className="text-lg text-muted-foreground max-w-xl">
                Pipeline, WhatsApp Pro, faturação SAF-T e cobranças de cada cliente num só espaço.
              </p>
            </div>

            <div className="flex items-end justify-between border-t border-border/60 pt-6">
              <div className="flex gap-10">
                {[["500+", "empresas"], ["24/7", "automação"]].map(([v, l]) => (
                  <div key={l}>
                    <p className="auth-serif text-3xl">{v}</p>
                    <p className="text-xs text-muted-foreground">{l}</p>
                  </div>
                ))}
              </div>
              <p className="italic text-muted-foreground">Não vendemos por si. Vendemos consigo.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
