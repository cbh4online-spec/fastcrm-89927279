import { PitchTokens } from '@/lib/pitch/tokens';
import { SlideShell, SlideHeader, SlideFooter } from './SlideShell';
import { Compass, Bot, TrendingUp, Zap } from 'lucide-react';

const PILLARS = [
  {
    letter: 'P',
    name: 'Planeamento',
    icon: Compass,
    desc: 'Estrutura comercial clara: pipeline, capacidade da equipa, metas e prioridades por consultor.',
    bullets: ['Funil de vendas', 'Capacidade da equipa', 'Segmentação de clientes'],
  },
  {
    letter: 'A',
    name: 'Automação',
    icon: Bot,
    desc: 'IA e workflows que eliminam tarefas repetitivas — mensagens, propostas, faturação e seguimento.',
    bullets: ['AI SDR', 'Sequências automáticas', 'Faturação recorrente'],
  },
  {
    letter: 'R',
    name: 'Resultados',
    icon: TrendingUp,
    desc: 'Decisões baseadas em dados: KPIs, relatórios, previsão de receita e risco de pipeline.',
    bullets: ['Dashboards executivos', 'Pipeline Risk Engine', 'MRR & Renovações'],
  },
  {
    letter: 'E',
    name: 'Eficiência',
    icon: Zap,
    desc: 'Mais negócios fechados com menos esforço — tempo libertado para o que gera valor.',
    bullets: ['-70% tarefas admin', '+3x produtividade', 'ROI mensurável'],
  },
];

export function SlideMethodPare({ pageNumber, total }: { tokens: PitchTokens; pageNumber: number; total: number }) {
  return (
    <SlideShell variant="light">
      <div className="absolute inset-0" style={{ padding: '80px 80px 100px' }}>
        <SlideHeader
          eyebrow="A base do sistema"
          title="Método PARE"
          subtitle="A metodologia que estrutura o FastCRM — quatro pilares para transformar a forma como a sua equipa vende."
        />

        <div className="grid grid-cols-4 gap-6 mt-10">
          {PILLARS.map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.letter}
                className="rounded-2xl border-2 border-[#0F172A]/10 bg-white p-8 flex flex-col"
                style={{ minHeight: 560 }}
              >
                <div className="flex items-center justify-between mb-6">
                  <div
                    className="w-20 h-20 rounded-2xl flex items-center justify-center font-black text-[#0F172A]"
                    style={{ background: '#22D3EE', fontSize: 52 }}
                  >
                    {p.letter}
                  </div>
                  <Icon className="w-10 h-10 text-[#0F172A]/40" />
                </div>
                <div className="font-bold text-[#0F172A]" style={{ fontSize: 32 }}>
                  {p.name}
                </div>
                <p className="text-[#475569] mt-3 leading-snug" style={{ fontSize: 20 }}>
                  {p.desc}
                </p>
                <ul className="mt-6 space-y-2">
                  {p.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-[#0F172A]" style={{ fontSize: 19 }}>
                      <span className="text-[#0E7490] font-bold">•</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="mt-10 rounded-2xl bg-[#0F172A] text-white p-8 flex items-center justify-between">
          <div>
            <div className="text-[#22D3EE] uppercase tracking-[0.2em] font-semibold" style={{ fontSize: 16 }}>
              Saber mais
            </div>
            <div className="font-bold mt-2" style={{ fontSize: 28 }}>
              metodopare.ai
            </div>
          </div>
          <div className="text-white/70 max-w-[900px] text-right" style={{ fontSize: 22 }}>
            O Método PARE é a base de todo o FastCRM — cada funcionalidade existe para servir um destes quatro pilares.
          </div>
        </div>
      </div>
      <SlideFooter pageNumber={pageNumber} total={total} label="Método PARE" />
    </SlideShell>
  );
}
