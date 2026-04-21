import { PitchTokens } from '@/lib/pitch/tokens';
import { SlideShell, SlideHeader, SlideFooter } from './SlideShell';
import { Bot, MessageSquare, Mail, Send } from 'lucide-react';

const channels = [
  { icon: Mail, label: 'Email', color: '#3B82F6' },
  { icon: MessageSquare, label: 'WhatsApp', color: '#16A34A' },
  { icon: Send, label: 'SMS', color: '#F59E0B' },
  { icon: Bot, label: 'AI Voice', color: '#8B5CF6' },
];

export function Slide07AISDR({ pageNumber, total }: { tokens: PitchTokens; pageNumber: number; total: number }) {
  return (
    <SlideShell variant="light">
      <div className="absolute inset-0" style={{ padding: '100px 80px' }}>
        <SlideHeader eyebrow="Funcionalidade #2" title="AI SDR & Outbound automatizado" subtitle="Sequências multi-canal personalizadas que prospectam 24/7, qualificam, agendam reuniões e entregam ao comercial humano." />
        <div className="grid grid-cols-12 gap-8 mt-8">
          <div className="col-span-7 space-y-5">
            {[
              { t: 'Enriquecimento automático', d: 'Cada lead é enriquecido com sector, dimensão, faturação e ICP Fit Score antes de entrar na sequência.' },
              { t: 'Mensagens personalizadas com IA', d: 'Gemini gera o copy adaptado ao destinatário, à conta-alvo e ao timing certo.' },
              { t: 'A/B testing automático', d: 'Compara templates e escolhe o vencedor — mede taxa de abertura, resposta e meeting booked.' },
              { t: 'Hand-off para humano', d: 'Quando o lead responde positivamente, é entregue ao comercial com contexto completo.' },
            ].map((it) => (
              <div key={it.t} className="rounded-xl p-6 border border-[#E2E8F0] bg-white">
                <div className="font-bold text-[#0F172A]" style={{ fontSize: 26 }}>{it.t}</div>
                <div className="text-[#475569] mt-2" style={{ fontSize: 20 }}>{it.d}</div>
              </div>
            ))}
          </div>
          <div className="col-span-5 rounded-2xl p-10 bg-gradient-to-br from-[#0F172A] to-[#1E293B] text-white">
            <div className="text-[#22D3EE] font-semibold uppercase tracking-wide" style={{ fontSize: 18 }}>Canais nativos</div>
            <div className="grid grid-cols-2 gap-4 mt-8">
              {channels.map((c) => (
                <div key={c.label} className="rounded-xl p-6 bg-white/5 border border-white/10 flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-xl flex items-center justify-center" style={{ background: c.color }}>
                    <c.icon className="w-9 h-9 text-white" />
                  </div>
                  <div className="font-semibold" style={{ fontSize: 22 }}>{c.label}</div>
                </div>
              ))}
            </div>
            <div className="mt-10 rounded-xl p-6 bg-[#22D3EE] text-[#0F172A]">
              <div className="font-black" style={{ fontSize: 48 }}>+62%</div>
              <div className="font-semibold mt-1" style={{ fontSize: 18 }}>de meetings booked vs outbound manual</div>
            </div>
          </div>
        </div>
      </div>
      <SlideFooter pageNumber={pageNumber} total={total} label="AI SDR" />
    </SlideShell>
  );
}
