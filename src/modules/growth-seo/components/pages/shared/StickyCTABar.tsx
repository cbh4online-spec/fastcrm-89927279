import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { X, Sparkles, ArrowRight } from 'lucide-react';
import { useTracking } from '../../../hooks/useTracking';

interface StickyCTABarProps {
  ctaText: string;
  ctaUrl?: string;
  ctaOnClick?: () => void;
  showAfterScroll?: number; // percentage (0-100)
  position?: 'top' | 'bottom';
  pageType: string;
  entitySlug?: string;
  className?: string;
}

export function StickyCTABar({
  ctaText,
  ctaUrl,
  ctaOnClick,
  showAfterScroll = 30,
  position = 'bottom',
  pageType,
  entitySlug,
  className = '',
}: StickyCTABarProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const hasTrackedImpression = useRef(false);
  const { trackCTAClick } = useTracking();

  useEffect(() => {
    const handleScroll = () => {
      const scrollPercentage = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
      
      if (scrollPercentage >= showAfterScroll && !isDismissed) {
        setIsVisible(true);
        
        if (!hasTrackedImpression.current) {
          hasTrackedImpression.current = true;
          trackCTAClick({
            cta_type: 'sticky_cta_impression',
            placement: position,
            page_type: pageType,
            entity_slug: entitySlug,
          });
        }
      } else if (scrollPercentage < showAfterScroll - 10) {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [showAfterScroll, isDismissed, position, pageType, entitySlug, trackCTAClick]);

  const handleCTAClick = () => {
    trackCTAClick({
      cta_type: 'sticky_cta',
      placement: position,
      page_type: pageType,
      entity_slug: entitySlug,
    });
    ctaOnClick?.();
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    setIsVisible(false);
  };

  if (!isVisible || isDismissed) return null;

  const positionClasses = position === 'top' 
    ? 'top-0 border-b' 
    : 'bottom-0 border-t';

  const CTAButton = (
    <Button 
      className="gap-2"
      onClick={handleCTAClick}
    >
      <Sparkles className="h-4 w-4" />
      {ctaText}
      <ArrowRight className="h-4 w-4" />
    </Button>
  );

  return (
    <div 
      className={`
        fixed left-0 right-0 z-40 
        bg-background/95 backdrop-blur-sm shadow-lg
        transform transition-transform duration-300
        ${positionClasses}
        ${isVisible ? 'translate-y-0' : position === 'top' ? '-translate-y-full' : 'translate-y-full'}
        ${className}
      `}
    >
      <div className="container py-3">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-medium text-muted-foreground hidden sm:block">
            Pronto para gerar keyword ideas?
          </p>
          
          <div className="flex items-center gap-3 ml-auto">
            {ctaUrl ? (
              <Link to={ctaUrl} onClick={handleCTAClick}>
                {CTAButton}
              </Link>
            ) : (
              CTAButton
            )}
            
            <Button 
              variant="ghost" 
              size="icon"
              className="h-8 w-8"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
