import { PitchTokens } from '@/lib/pitch/tokens';
import { SlideShell, SlideHeader, SlideFooter } from './SlideShell';

const stages = [
  { name: 'Lead', count: 42, color: '#94A3B8' },
  { name: 'Qualificado', count: 28, color: '#3B82F6' },
  { name: 'Proposta', count: 14, color: '#22D3EE' },
  { name: 'Negociação', count: 7, color: '#8B5CF6' },
  { name: 'Ganho', count: 4, color: '#16A34A' },
];

export function Slide09Pipeline({ pageNumber, total }: { tokens: PitchTokens; pageNumber: number; total: number }) {
  return (
    <SlideShell variant="light">
      <div className="absolute inset-0" style={{ padding: '100px 80px' }}>
        <SlideHeader eyebrow="Funcionalidade #4" title="Pipeline, Propostas e Faturação" subtitle="Do primeiro contacto à fatura paga — sem mudar de plataforma." />
        <div className="grid grid-cols-5 gap-4 mt-8">
          {stages.map((s) => (
            <div key={s.name} className="rounded-xl p-6 bg-[#F8FAFC] border-t-4" style={{ borderColor: s.color }}>
              <div className="text-[#64748B] uppercase tracking-wide font-semibold" style={{ fontSize: 18 }}>{s.name}</div>
              <div className="font-black text-[#0F172A] mt-2" style={{ fontSize: 64 }}>{s.count}</div>
              <div className="text-[#64748B]" style={{ fontSize: 18 }}>negócios</div>
            </div>
          ))}
        </div>
        <div className="mt-12 grid grid-cols-3 gap-6">
          <div className="rounded-2xl p-8 border border-[#E2E8F0]">
            <div className="font-bold text-[#0F172A] mb-3" style={{ fontSize: 28 }}>📄 Propostas em 1 clique</div>
            <div className="text-[#475569]" style={{ fontSize: 20 }}>Templates dinâmicos, assinatura digital e tracking de abertura.</div>
          </div>
          <div className="rounded-2xl p-8 border border-[#E2E8F0]">
            <div className="font-bold text-[#0F172A] mb-3" style={{ fontSize: 28 }}>🧾 Faturação certificada</div>
            <div className="text-[#475569]" style={{ fontSize: 20 }}>Faturas e recibos em conformidade com a AT, com pagamento integrado.</div>
          </div>
          <div className="rounded-2xl p-8 border border-[#E2E8F0] bg-gradient-to-br from-[#CFFAFE] to-white">
            <div className="font-bold text-[#0F172A] mb-3" style={{ fontSize: 28 }}>🔁 Renovações & MRR</div>
            <div className="text-[#475569]" style={{ fontSize: 20 }}>Contratos recorrentes, alertas de churn e MRR em tempo real.</div>
          </div>
        </div>
      </div>
      <SlideFooter pageNumber={pageNumber} total={total} label="Pipeline" />
    </SlideShell>
  );
}
