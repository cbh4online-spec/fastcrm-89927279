import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, Truck, MapPin, Package } from "lucide-react";
import { Input } from "@/components/ui/input";

interface ShippingOption {
  id: string;
  name: string;
  price: number;
  estimate: string;
  maxWeight: number;
}

interface ShippingSelectorProps {
  deliveryMode: string;
  onSelect: (option: { method: string; price: number; carrier: string; estimate: string } | null) => void;
  selectedMethod: string | null;
  onMeetupLocationChange?: (location: string) => void;
  meetupLocation?: string;
}

export function ShippingSelector({ deliveryMode, onSelect, selectedMethod, onMeetupLocationChange, meetupLocation }: ShippingSelectorProps) {
  const { t } = useTranslation('marketplace');
  const [options, setOptions] = useState<ShippingOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'shipping' | 'in_person'>(
    deliveryMode === 'in_person' ? 'in_person' : 'shipping'
  );

  useEffect(() => {
    if (activeTab === 'shipping') {
      loadShippingOptions();
    }
  }, [activeTab]);

  const loadShippingOptions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("calculate-shipping", {
        body: { totalWeightKg: 0.5 },
      });
      if (!error && data?.options) {
        setOptions(data.options);
      }
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  };

  const showShippingTab = deliveryMode !== 'in_person';
  const showInPersonTab = deliveryMode !== 'shipping';

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold flex items-center gap-2">
        <Truck className="h-4 w-4 text-primary" />
        {t('shippingMethod')}
      </h4>

      {(showShippingTab && showInPersonTab) && (
        <div className="flex gap-2">
          <button
            onClick={() => { setActiveTab('shipping'); onSelect(null); }}
            className={`flex-1 text-xs py-2 px-3 rounded-lg border transition-colors ${activeTab === 'shipping' ? 'bg-primary/10 border-primary text-primary' : 'border-border'}`}
          >
            <Package className="h-3.5 w-3.5 inline mr-1" /> {t('shippingTabShip')}
          </button>
          <button
            onClick={() => { setActiveTab('in_person'); onSelect({ method: 'in_person', price: 0, carrier: '', estimate: '' }); }}
            className={`flex-1 text-xs py-2 px-3 rounded-lg border transition-colors ${activeTab === 'in_person' ? 'bg-primary/10 border-primary text-primary' : 'border-border'}`}
          >
            <MapPin className="h-3.5 w-3.5 inline mr-1" /> {t('shippingTabMeetup')}
          </button>
        </div>
      )}

      {activeTab === 'shipping' && (
        loading ? (
          <div className="flex items-center justify-center py-4 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> {t('loadingShipping')}
          </div>
        ) : (
          <RadioGroup value={selectedMethod || ''} onValueChange={(val) => {
            const opt = options.find(o => o.id === val);
            if (opt) onSelect({ method: opt.id, price: opt.price, carrier: opt.name, estimate: opt.estimate });
          }}>
            {options.map(opt => (
              <div key={opt.id} className={`flex items-center space-x-3 rounded-lg border p-3 cursor-pointer transition-colors ${selectedMethod === opt.id ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/30'}`}>
                <RadioGroupItem value={opt.id} id={`ship-${opt.id}`} />
                <Label htmlFor={`ship-${opt.id}`} className="flex-1 cursor-pointer">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium">{opt.name}</p>
                      <p className="text-xs text-muted-foreground">{opt.estimate}</p>
                    </div>
                    <span className="text-sm font-semibold">{opt.price.toFixed(2)} €</span>
                  </div>
                </Label>
              </div>
            ))}
          </RadioGroup>
        )
      )}

      {activeTab === 'in_person' && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{t('meetupDesc')}</p>
          <Input
            placeholder={t('meetupLocationPlaceholder')}
            value={meetupLocation || ''}
            onChange={(e) => onMeetupLocationChange?.(e.target.value)}
          />
          <p className="text-xs text-muted-foreground font-medium text-primary">{t('freeDelivery')}</p>
        </div>
      )}
    </div>
  );
}
