import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { X, Lock, Sparkles, ArrowRight } from 'lucide-react';
import { useTracking } from '../../../hooks/useTracking';

interface ValueGateBannerProps {
  variant: 'soft' | 'hard';
  title?: string;
  description?: string;
  ctaText?: string;
  ctaUrl?: string;
  showAfterScroll?: number; // percentage (0-100)
  pageType: string;
  entitySlug?: string;
  className?: string;
}

export function ValueGateBanner({
  variant,
  title,
  description,
  ctaText,
  ctaUrl = '/auth',
  showAfterScroll = 50,
  pageType,
  entitySlug,
  className = '',
}: ValueGateBannerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const hasTrackedImpression = useRef(false);
  const { trackCTAClick } = useTracking();

  const defaultContent = {
    soft: {
      title: 'Crie uma conta gratuita para ver todas as keywords',
      description: 'Desbloqueie a lista completa de keyword ideas, exportação e mais.',
      ctaText: 'Criar Conta Gratuita',
    },
    hard: {
      title: 'Exporte as suas keyword ideas',
      description: 'Faça upgrade para exportar keywords em CSV e aceder a dados avançados.',
      ctaText: 'Fazer Upgrade',
    },
  };

  const content = {
    title: title || defaultContent[variant].title,
    description: description || defaultContent[variant].description,
    ctaText: ctaText || defaultContent[variant].ctaText,
  };

  useEffect(() => {
    const handleScroll = () => {
      const scrollPercentage = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
      
      if (scrollPercentage >= showAfterScroll && !isDismissed) {
        setIsVisible(true);
        
        // Track impression only once
        if (!hasTrackedImpression.current) {
          hasTrackedImpression.current = true;
          // Using trackCTAClick for impression tracking
          trackCTAClick({
            cta_type: `value_gate_${variant}_impression`,
            placement: 'banner',
            page_type: pageType,
            entity_slug: entitySlug,
          });
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [showAfterScroll, isDismissed, variant, pageType, entitySlug, trackCTAClick]);

  const handleCTAClick = () => {
    trackCTAClick({
      cta_type: `value_gate_${variant}`,
      placement: 'banner',
      page_type: pageType,
      entity_slug: entitySlug,
    });
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    setIsVisible(false);
  };

  if (!isVisible || isDismissed) return null;

  return (
    <div 
      className={`fixed bottom-0 left-0 right-0 z-50 transform transition-transform duration-300 ${
        isVisible ? 'translate-y-0' : 'translate-y-full'
      } ${className}`}
    >
      <div className={`
        ${variant === 'soft' 
          ? 'bg-primary text-primary-foreground' 
          : 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground'
        }
        shadow-lg border-t
      `}>
        <div className="container py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {variant === 'soft' ? (
                <Sparkles className="h-6 w-6 flex-shrink-0" />
              ) : (
                <Lock className="h-6 w-6 flex-shrink-0" />
              )}
              <div>
                <p className="font-semibold">{content.title}</p>
                <p className="text-sm opacity-90">{content.description}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Link to={ctaUrl} onClick={handleCTAClick}>
                <Button 
                  variant={variant === 'soft' ? 'secondary' : 'default'}
                  className="gap-2 whitespace-nowrap"
                >
                  {content.ctaText}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              
              {variant === 'soft' && (
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="text-primary-foreground hover:bg-primary-foreground/10"
                  onClick={handleDismiss}
                >
                  <X className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
