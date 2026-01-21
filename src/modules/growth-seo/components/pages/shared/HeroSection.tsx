import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Sparkles, Zap } from 'lucide-react';
import { useTracking } from '../../../hooks/useTracking';

interface HeroSectionProps {
  title: string;
  subtitle?: string;
  ctaText: string;
  ctaUrl?: string;
  ctaOnClick?: () => void;
  secondaryCTAText?: string;
  secondaryCTAUrl?: string;
  badge?: string;
  showFreeLabel?: boolean;
  pageType: string;
  entitySlug?: string;
  className?: string;
}

export function HeroSection({
  title,
  subtitle,
  ctaText,
  ctaUrl,
  ctaOnClick,
  secondaryCTAText,
  secondaryCTAUrl,
  badge,
  showFreeLabel = true,
  pageType,
  entitySlug,
  className = '',
}: HeroSectionProps) {
  const { trackCTAClick } = useTracking();

  const handlePrimaryClick = () => {
    trackCTAClick({
      cta_type: 'primary',
      placement: 'hero',
      page_type: pageType,
      entity_slug: entitySlug,
    });
    ctaOnClick?.();
  };

  const handleSecondaryClick = () => {
    trackCTAClick({
      cta_type: 'secondary',
      placement: 'hero',
      page_type: pageType,
      entity_slug: entitySlug,
    });
  };

  const PrimaryButton = (
    <Button 
      size="lg" 
      className="gap-2 text-lg px-8 py-6"
      onClick={handlePrimaryClick}
    >
      <Sparkles className="h-5 w-5" />
      {ctaText}
      <ArrowRight className="h-5 w-5" />
    </Button>
  );

  return (
    <section className={`py-12 md:py-16 lg:py-20 ${className}`}>
      <div className="max-w-4xl mx-auto text-center space-y-6">
        {badge && (
          <Badge variant="secondary" className="text-sm px-4 py-1">
            <Zap className="h-3 w-3 mr-1" />
            {badge}
          </Badge>
        )}
        
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">
          {title}
        </h1>
        
        {subtitle && (
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            {subtitle}
          </p>
        )}
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          {ctaUrl ? (
            <Link to={ctaUrl} onClick={handlePrimaryClick}>
              {PrimaryButton}
            </Link>
          ) : (
            PrimaryButton
          )}
          
          {secondaryCTAText && secondaryCTAUrl && (
            <Link to={secondaryCTAUrl} onClick={handleSecondaryClick}>
              <Button variant="outline" size="lg" className="gap-2">
                {secondaryCTAText}
              </Button>
            </Link>
          )}
        </div>
        
        {showFreeLabel && (
          <p className="text-sm text-muted-foreground">
            ✓ Grátis · Sem necessidade de cartão de crédito
          </p>
        )}
      </div>
    </section>
  );
}
