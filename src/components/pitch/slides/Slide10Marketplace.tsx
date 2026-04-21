import { PitchTokens } from '@/lib/pitch/tokens';
import { SlideShell, SlideHeader, SlideFooter } from './SlideShell';
import { ShoppingBag, Store, BookOpen } from 'lucide-react';

export function Slide10Marketplace({ pageNumber, total }: { tokens: PitchTokens; pageNumber: number; total: number }) {
  return (
    <SlideShell variant="light">
      <div className="absolute inset-0" style={{ padding: '100px 80px' }}>
        <SlideHeader eyebrow="Funcionalidade #5" title="Loja, Marketplace e Lead Magnets" subtitle="Vender online não devia exigir 5 ferramentas. O FastCRM inclui-as todas." />
        <div className="grid grid-cols-3 gap-6 mt-8">
          {[
            {
              icon: ShoppingBag,
              t: 'Loja Online B2C',
              d: 'Catálogo, checkout, métodos de pagamento (Stripe, MB Way, multibanco) e cumprimento legal PT (DL 24/2014).',
              tag: 'B2C',
            },
            {
              icon: Store,
              t: 'Marketplace C2C / B2B',
              d: 'Múltiplos vendedores, reputação, reviews, boost de anúncios, pagamentos divididos.',
              tag: 'C2C · B2B',
            },
            {
              icon: BookOpen,
              t: 'Ebooks & Lead Magnets',
              d: 'Captura de leads via gating de ebooks, com nome/email/telefone integrado no CRM.',
              tag: 'Lead Gen',
            },
          ].map((c) => (
            <div key={c.t} className="rounded-2xl p-10 bg-gradient-to-br from-[#0F172A] to-[#1E293B] text-white">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-xl bg-[#22D3EE] flex items-center justify-center">
                  <c.icon className="w-9 h-9 text-[#0F172A]" />
                </div>
                <div className="text-[#22D3EE] font-semibold uppercase tracking-wide" style={{ fontSize: 16 }}>{c.tag}</div>
              </div>
              <div className="font-black mt-4" style={{ fontSize: 32 }}>{c.t}</div>
              <div className="text-white/70 mt-4" style={{ fontSize: 20 }}>{c.d}</div>
            </div>
          ))}
        </div>
        <div className="mt-10 rounded-2xl p-8 bg-[#CFFAFE] border-l-8 border-[#22D3EE]">
          <div className="font-bold text-[#0F172A]" style={{ fontSize: 26 }}>
            💡 Cada venda na loja, ebook descarregado ou anúncio publicado vira automaticamente uma oportunidade no CRM — fluxo end-to-end sem integrações externas.
          </div>
        </div>
      </div>
      <SlideFooter pageNumber={pageNumber} total={total} label="Loja & Marketplace" />
    </SlideShell>
  );
}
