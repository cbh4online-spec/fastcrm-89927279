import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowRight, Rocket, Sparkles, Zap } from 'lucide-react';
import { useTracking } from '../../../hooks/useTracking';
import type { CTA } from '../../../types';

interface CTASectionProps {
  cta?: CTA;
  pageType?: string;
  entitySlug?: string;
  variant?: 'inline' | 'hero' | 'sidebar' | 'footer';
  className?: string;
}

const defaultCTA: CTA = {
  type: 'signup',
  text: 'Começar gratuitamente',
  url: '/auth',
  variant: 'primary',
};

const ctaIcons = {
  signup: Rocket,
  try_tool: Zap,
  export: ArrowRight,
  install: ArrowRight,
  contact: Sparkles,
  upgrade: Sparkles,
};

export function CTASection({ 
  cta = defaultCTA, 
  pageType, 
  entitySlug,
  variant = 'inline',
  className = '' 
}: CTASectionProps) {
  const { trackCTAClick } = useTracking();
  const Icon = ctaIcons[cta.type] || ArrowRight;

  const handleClick = () => {
    trackCTAClick({
      cta_type: cta.type,
      placement: variant as 'hero' | 'sidebar' | 'inline' | 'footer',
      page_type: pageType,
      entity_slug: entitySlug,
    });
  };

  if (variant === 'hero') {
    return (
      <Card className={`p-8 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20 ${className}`}>
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-xl font-semibold mb-2">Pronto para começar?</h3>
            <p className="text-muted-foreground">
              Experimente gratuitamente e veja os resultados em minutos.
            </p>
          </div>
          <Link to={cta.url} onClick={handleClick}>
            <Button size="lg" className="gap-2">
              <Icon className="w-5 h-5" />
              {cta.text}
            </Button>
          </Link>
        </div>
      </Card>
    );
  }

  if (variant === 'sidebar') {
    return (
      <Card className={`p-6 sticky top-24 ${className}`}>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="font-semibold">Experimente agora</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Crie a sua conta gratuita e comece a usar em segundos.
          </p>
          <Link to={cta.url} onClick={handleClick} className="block">
            <Button className="w-full gap-2">
              <Icon className="w-4 h-4" />
              {cta.text}
            </Button>
          </Link>
          <p className="text-xs text-center text-muted-foreground">
            Sem cartão de crédito
          </p>
        </div>
      </Card>
    );
  }

  if (variant === 'footer') {
    return (
      <div className={`py-12 text-center ${className}`}>
        <h3 className="text-2xl font-bold mb-4">Comece hoje</h3>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          Junte-se a milhares de profissionais que já usam o FastCRM.
        </p>
        <Link to={cta.url} onClick={handleClick}>
          <Button size="lg" className="gap-2">
            <Icon className="w-5 h-5" />
            {cta.text}
          </Button>
        </Link>
      </div>
    );
  }

  // Default inline variant
  return (
    <div className={`flex items-center gap-4 py-4 ${className}`}>
      <Link to={cta.url} onClick={handleClick}>
        <Button variant={cta.variant === 'outline' ? 'outline' : 'default'} className="gap-2">
          <Icon className="w-4 h-4" />
          {cta.text}
        </Button>
      </Link>
    </div>
  );
}
