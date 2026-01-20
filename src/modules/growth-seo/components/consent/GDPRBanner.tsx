import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Cookie, Settings, X } from 'lucide-react';
import { useConsent } from '../../hooks/useConsent';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function GDPRBanner() {
  const { consent, hasConsented, acceptAll, rejectOptional, updateConsent, isLoading } = useConsent();
  const [showPreferences, setShowPreferences] = useState(false);
  const [tempConsent, setTempConsent] = useState({
    analytics: consent.analytics,
    marketing: consent.marketing,
  });

  if (isLoading || hasConsented) return null;

  const handleSavePreferences = () => {
    updateConsent({
      necessary: true,
      analytics: tempConsent.analytics,
      marketing: tempConsent.marketing,
    });
    setShowPreferences(false);
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background/95 backdrop-blur-sm border-t shadow-lg">
        <div className="container max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-start gap-3 flex-1">
              <Cookie className="w-6 h-6 text-primary shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-sm">Utilizamos cookies</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Para melhorar a sua experiência, analisar o tráfego do site e personalizar conteúdos. 
                  Pode gerir as suas preferências a qualquer momento.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowPreferences(true)}
                className="gap-2"
              >
                <Settings className="w-4 h-4" />
                Preferências
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={rejectOptional}
              >
                Rejeitar opcionais
              </Button>
              <Button 
                size="sm" 
                onClick={acceptAll}
              >
                Aceitar todos
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={showPreferences} onOpenChange={setShowPreferences}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cookie className="w-5 h-5" />
              Preferências de Cookies
            </DialogTitle>
            <DialogDescription>
              Escolha quais tipos de cookies pretende aceitar. Os cookies necessários são sempre ativos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Necessary */}
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label className="font-medium">Necessários</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Essenciais para o funcionamento do site. Não podem ser desativados.
                  </p>
                </div>
                <Switch checked disabled />
              </div>
            </Card>

            {/* Analytics */}
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label className="font-medium">Analytics</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ajudam-nos a entender como usa o site (Google Analytics, Microsoft Clarity).
                  </p>
                </div>
                <Switch 
                  checked={tempConsent.analytics}
                  onCheckedChange={(checked) => setTempConsent(prev => ({ ...prev, analytics: checked }))}
                />
              </div>
            </Card>

            {/* Marketing */}
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label className="font-medium">Marketing</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Permitem mostrar anúncios relevantes (Meta Pixel).
                  </p>
                </div>
                <Switch 
                  checked={tempConsent.marketing}
                  onCheckedChange={(checked) => setTempConsent(prev => ({ ...prev, marketing: checked }))}
                />
              </div>
            </Card>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowPreferences(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSavePreferences}>
              Guardar preferências
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
