import { PitchTokens } from '@/lib/pitch/tokens';
import { SlideShell, SlideHeader, SlideFooter } from './SlideShell';
import { AlertTriangle, Clock, Users2, TrendingDown } from 'lucide-react';

const items = [
  { icon: Clock, title: 'Leads perdidos', text: 'Equipas comerciais perdem 60% dos leads por falta de follow-up rápido e estruturado.' },
  { icon: Users2, title: 'Dados dispersos', text: 'Excel, WhatsApp, email, formulários — informação espalhada sem uma vista única do cliente.' },
  { icon: TrendingDown, title: 'Sem previsibilidade', text: 'Pipeline pouco fiável, previsões de receita baseadas em sentimento e não em dados.' },
  { icon: AlertTriangle, title: 'Operação manual', text: 'Tarefas repetitivas (mensagens, propostas, faturação) consomem o tempo de quem devia vender.' },
];

export function Slide02Problem({ pageNumber, total }: { tokens: PitchTokens; pageNumber: number; total: number }) {
  return (
    <SlideShell variant="light">
      <div className="absolute inset-0" style={{ padding: '100px 80px' }}>
        <SlideHeader eyebrow="O Problema" title="O dia-a-dia das PME comerciais" subtitle="Mais tempo em tarefas operacionais do que a fechar negócios." />
        <div className="grid grid-cols-2 gap-8 mt-8">
          {items.map((it) => (
            <div key={it.title} className="border border-[#E2E8F0] rounded-2xl p-10 bg-white shadow-sm">
              <div className="w-16 h-16 rounded-xl flex items-center justify-center mb-6" style={{ background: '#CFFAFE' }}>
                <it.icon className="w-9 h-9" style={{ color: '#0E7490' }} />
              </div>
              <div className="font-bold mb-3" style={{ fontSize: 32 }}>{it.title}</div>
              <div className="text-[#475569]" style={{ fontSize: 22 }}>{it.text}</div>
            </div>
          ))}
        </div>
      </div>
      <SlideFooter pageNumber={pageNumber} total={total} label="O Problema" />
    </SlideShell>
  );
}
