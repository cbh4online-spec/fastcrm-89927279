import { PitchTokens } from '@/lib/pitch/tokens';
import { SlideShell, SlideHeader, SlideFooter } from './SlideShell';
import { Users, CheckCircle2 } from 'lucide-react';

export function Slide06CRM({ pageNumber, total }: { tokens: PitchTokens; pageNumber: number; total: number }) {
  return (
    <SlideShell variant="light">
      <div className="absolute inset-0" style={{ padding: '100px 80px' }}>
        <SlideHeader eyebrow="Funcionalidade #1" title="CRM unificado" subtitle="Contactos, Leads, Empresas e Negócios numa só base — com PARE Score, deduplicação e enriquecimento automático." />
        <div className="grid grid-cols-2 gap-12 mt-8">
          <div className="space-y-6">
            {[
              'Vista 360º do cliente: histórico, conversas, faturas, ficheiros',
              'Deduplicação inteligente por NIF, email e telefone',
              'PARE Score — qualificação automática de leads (0–100)',
              'Pipeline visual estilo Kanban + previsão de receita',
              'Integrações nativas: GoHighLevel, Google, WhatsApp, SMS',
            ].map((b) => (
              <div key={b} className="flex items-start gap-4">
                <CheckCircle2 className="w-9 h-9 mt-1 flex-shrink-0" style={{ color: '#0E7490' }} />
                <div className="text-[#0F172A]" style={{ fontSize: 28 }}>{b}</div>
              </div>
            ))}
          </div>
          <div className="rounded-2xl p-12 bg-gradient-to-br from-[#0F172A] to-[#1E293B] text-white">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-16 h-16 rounded-xl bg-[#22D3EE] flex items-center justify-center">
                <Users className="w-9 h-9 text-[#0F172A]" />
              </div>
              <div className="font-bold" style={{ fontSize: 32 }}>Lead capturado</div>
            </div>
            <div className="space-y-5">
              <div className="flex justify-between items-baseline border-b border-white/10 pb-4">
                <span className="text-white/60" style={{ fontSize: 22 }}>Nome</span>
                <span className="font-semibold" style={{ fontSize: 26 }}>Ana Ferreira</span>
              </div>
              <div className="flex justify-between items-baseline border-b border-white/10 pb-4">
                <span className="text-white/60" style={{ fontSize: 22 }}>Empresa</span>
                <span className="font-semibold" style={{ fontSize: 26 }}>Tech Solutions, Lda</span>
              </div>
              <div className="flex justify-between items-baseline border-b border-white/10 pb-4">
                <span className="text-white/60" style={{ fontSize: 22 }}>Origem</span>
                <span className="font-semibold" style={{ fontSize: 26 }}>Loja Online</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-white/60" style={{ fontSize: 22 }}>PARE Score</span>
                <span className="font-black text-[#22D3EE]" style={{ fontSize: 56 }}>87</span>
              </div>
              <div className="text-white/70 mt-4" style={{ fontSize: 20 }}>
                ✓ NIF válido · ✓ Email empresarial · ✓ Sector ICP · ⚠ Sem telefone
              </div>
            </div>
          </div>
        </div>
      </div>
      <SlideFooter pageNumber={pageNumber} total={total} label="CRM unificado" />
    </SlideShell>
  );
}
