import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Save, Loader2, Store, ShieldCheck, Eye, Percent, Wallet, ShoppingCart } from "lucide-react";
import { useStoreSettings, useUpsertStoreSettings } from "@/hooks/useStoreSettings";
import { useState, useEffect } from "react";

export function StoreC2CSettings() {
  const { data: settings, isLoading } = useStoreSettings();
  const upsert = useUpsertStoreSettings();

  const [form, setForm] = useState({
    c2c_enabled: false,
    c2c_seller_approval_required: true,
    c2c_listing_moderation_required: true,
    c2c_default_commission_rate: 10,
    c2c_payout_minimum_amount: 25,
    c2c_payout_manual_mode: true,
    c2c_allow_mixed_cart: true,
  });

  useEffect(() => {
    if (settings) {
      setForm({
        c2c_enabled: settings.c2c_enabled ?? false,
        c2c_seller_approval_required: settings.c2c_seller_approval_required ?? true,
        c2c_listing_moderation_required: settings.c2c_listing_moderation_required ?? true,
        c2c_default_commission_rate: settings.c2c_default_commission_rate ?? 10,
        c2c_payout_minimum_amount: settings.c2c_payout_minimum_amount ?? 25,
        c2c_payout_manual_mode: settings.c2c_payout_manual_mode ?? true,
        c2c_allow_mixed_cart: settings.c2c_allow_mixed_cart ?? true,
      });
    }
  }, [settings]);

  const handleSave = () => {
    upsert.mutate(form as any);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Master toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Marketplace C2C
          </CardTitle>
          <CardDescription>
            Permite que vendedores externos publiquem e vendam produtos na sua loja.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label htmlFor="c2c_enabled" className="font-medium">Ativar Marketplace C2C</Label>
            <Switch
              id="c2c_enabled"
              checked={form.c2c_enabled}
              onCheckedChange={(v) => setForm(f => ({ ...f, c2c_enabled: v }))}
            />
          </div>
        </CardContent>
      </Card>

      {form.c2c_enabled && (
        <>
          {/* Moderation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-4 w-4" />
                Moderação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Aprovação de sellers obrigatória</Label>
                  <p className="text-sm text-muted-foreground">Sellers precisam de aprovação antes de publicar</p>
                </div>
                <Switch
                  checked={form.c2c_seller_approval_required}
                  onCheckedChange={(v) => setForm(f => ({ ...f, c2c_seller_approval_required: v }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Moderação de listings obrigatória</Label>
                  <p className="text-sm text-muted-foreground">Listings ficam pendentes até aprovação</p>
                </div>
                <Switch
                  checked={form.c2c_listing_moderation_required}
                  onCheckedChange={(v) => setForm(f => ({ ...f, c2c_listing_moderation_required: v }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Comissão */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Percent className="h-4 w-4" />
                Comissão
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Comissão padrão (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={form.c2c_default_commission_rate}
                    onChange={(e) => setForm(f => ({ ...f, c2c_default_commission_rate: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payouts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Wallet className="h-4 w-4" />
                Payouts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Valor mínimo para payout (€)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.c2c_payout_minimum_amount}
                  onChange={(e) => setForm(f => ({ ...f, c2c_payout_minimum_amount: parseFloat(e.target.value) || 0 }))}
                  className="max-w-xs"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Payouts manuais</Label>
                  <p className="text-sm text-muted-foreground">Admin aprova e processa payouts manualmente</p>
                </div>
                <Switch
                  checked={form.c2c_payout_manual_mode}
                  onCheckedChange={(v) => setForm(f => ({ ...f, c2c_payout_manual_mode: v }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Carrinho */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShoppingCart className="h-4 w-4" />
                Carrinho
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Permitir carrinho misto</Label>
                  <p className="text-sm text-muted-foreground">Produtos da loja e do marketplace no mesmo checkout</p>
                </div>
                <Switch
                  checked={form.c2c_allow_mixed_cart}
                  onCheckedChange={(v) => setForm(f => ({ ...f, c2c_allow_mixed_cart: v }))}
                />
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={upsert.isPending} className="gap-2">
          {upsert.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar
        </Button>
      </div>
    </div>
  );
}
