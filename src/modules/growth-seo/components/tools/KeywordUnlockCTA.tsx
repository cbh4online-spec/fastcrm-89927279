import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Lock, Sparkles, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTracking } from '../../hooks/useTracking';

interface KeywordUnlockCTAProps {
  totalCount: number;
  visibleCount: number;
  onUnlock: () => void;
  variant?: 'inline' | 'overlay' | 'banner';
}

export function KeywordUnlockCTA({ 
  totalCount, 
  visibleCount, 
  onUnlock,
  variant = 'inline' 
}: KeywordUnlockCTAProps) {
  const { trackCTAClick } = useTracking();
  const hiddenCount = totalCount - visibleCount;

  const handleClick = () => {
    trackCTAClick({
      cta_type: 'unlock_keywords',
      placement: variant,
      page_type: 'tool',
    });
    onUnlock();
  };

  if (variant === 'banner') {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-4 shadow-lg z-50">
        <div className="container flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5" />
            <span className="font-medium">
              +{hiddenCount} keywords bloqueadas
            </span>
          </div>
          <Link to="/auth">
            <Button variant="secondary" size="sm" onClick={handleClick}>
              Desbloquear Agora
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (variant === 'overlay') {
    return (
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/95 to-transparent flex items-end justify-center pb-8">
        <Card className="p-6 text-center max-w-md mx-4 shadow-xl">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-xl font-bold mb-2">
            +{hiddenCount} Keywords Escondidas
          </h3>
          <p className="text-muted-foreground mb-4">
            Crie uma conta gratuita para desbloquear todas as keyword ideas e exportar em CSV.
          </p>
          <Link to="/auth">
            <Button className="w-full gap-2" onClick={handleClick}>
              <Sparkles className="w-4 h-4" />
              Criar Conta Gratuita
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  // Default inline variant
  return (
    <Card className="mt-6 p-6 bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
      <div className="flex flex-col md:flex-row items-center gap-4">
        <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
          <Lock className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1 text-center md:text-left">
          <h4 className="font-semibold text-lg">
            Desbloqueie +{hiddenCount} Keywords
          </h4>
          <p className="text-muted-foreground text-sm">
            Está a ver {visibleCount} de {totalCount} keywords. Crie uma conta para ver todas e exportar.
          </p>
        </div>
        <Link to="/auth">
          <Button className="gap-2 whitespace-nowrap" onClick={handleClick}>
            <Sparkles className="w-4 h-4" />
            Desbloquear Todas
          </Button>
        </Link>
      </div>
    </Card>
  );
}
