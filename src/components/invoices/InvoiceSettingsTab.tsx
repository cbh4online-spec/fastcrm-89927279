import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  FileText, 
  DollarSign,
  Building2,
  Save,
  Bell,
  Palette,
  Search,
  Loader2,
  Upload,
  X,
  Image as ImageIcon
} from "lucide-react";
import { useNifLookup } from "@/hooks/useNifLookup";
import { useInvoiceSettings } from "@/hooks/useInvoiceSettings";
import { Skeleton } from "@/components/ui/skeleton";

export function InvoiceSettingsTab() {
  const { 
    settings, 
    setSettings, 
    isLoading, 
    isSaving, 
    saveSettings, 
    uploadLogo 
  } = useInvoiceSettings();
  
  const { lookup, isLoading: isNifLoading } = useNifLookup({ showToasts: true });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const handleNifLookup = async () => {
    const result = await lookup(settings.company_nif);
    if (result) {
      const addressParts = [
        result.address,
        result.postal_code,
        result.city
      ].filter(Boolean);
      
      setSettings(prev => ({
        ...prev,
        company_name: result.company_name || prev.company_name,
        company_address: addressParts.join(", ") || prev.company_address,
        company_email: result.email || prev.company_email,
        company_phone: result.phone || prev.company_phone,
      }));
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return;
    }

    setIsUploadingLogo(true);
    const url = await uploadLogo(file);
    if (url) {
      setSettings(prev => ({ ...prev, company_logo_url: url }));
    }
    setIsUploadingLogo(false);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveLogo = () => {
    setSettings(prev => ({ ...prev, company_logo_url: null }));
  };

  const isValidNif = /^\d{9}$/.test(settings.company_nif?.replace(/\s/g, '') || '');

  const handleSave = async () => {
    await saveSettings(settings);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-72" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Numeração */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Numeração de Faturas
          </CardTitle>
          <CardDescription>
            Configure o prefixo e numeração automática das suas faturas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="prefix">Prefixo</Label>
              <Input
                id="prefix"
                value={settings.invoice_prefix}
                onChange={(e) => setSettings({ ...settings, invoice_prefix: e.target.value })}
                placeholder="FAT-"
              />
              <p className="text-xs text-muted-foreground">
                Ex: FAT-2025-0001
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nextNumber">Próximo Número</Label>
              <Input
                id="nextNumber"
                type="number"
                value={settings.next_number}
                onChange={(e) => setSettings({ ...settings, next_number: parseInt(e.target.value) || 1 })}
                min={1}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dados da Empresa */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Dados da Empresa
          </CardTitle>
          <CardDescription>
            Informações que aparecem nas suas faturas. Introduza o NIF e clique em Pesquisar para preencher automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Logo Upload */}
          <div className="space-y-2">
            <Label>Logótipo da Empresa</Label>
            <div className="flex items-start gap-4">
              {settings.company_logo_url ? (
                <div className="relative">
                  <img 
                    src={settings.company_logo_url} 
                    alt="Logótipo da empresa" 
                    className="h-24 w-auto max-w-[200px] object-contain border rounded-md p-2"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6"
                    onClick={handleRemoveLogo}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div 
                  className="h-24 w-40 border-2 border-dashed rounded-md flex flex-col items-center justify-center gap-2 text-muted-foreground cursor-pointer hover:border-primary hover:text-primary transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {isUploadingLogo ? (
                    <Loader2 className="h-8 w-8 animate-spin" />
                  ) : (
                    <>
                      <ImageIcon className="h-8 w-8" />
                      <span className="text-xs">Carregar logótipo</span>
                    </>
                  )}
                </div>
              )}
              <div className="flex-1 space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                {!settings.company_logo_url && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingLogo}
                  >
                    {isUploadingLogo ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    Escolher ficheiro
                  </Button>
                )}
                <p className="text-xs text-muted-foreground">
                  Formatos: PNG, JPG, SVG. Máximo: 2MB
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="companyName">Nome da Empresa</Label>
              <Input
                id="companyName"
                value={settings.company_name}
                onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                placeholder="A sua empresa, Lda."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyNif">NIF</Label>
              <div className="flex gap-2">
                <Input
                  id="companyNif"
                  value={settings.company_nif}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 9);
                    setSettings({ ...settings, company_nif: value });
                  }}
                  placeholder="123456789"
                  maxLength={9}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleNifLookup}
                  disabled={!isValidNif || isNifLoading}
                  className="shrink-0"
                >
                  {isNifLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  <span className="ml-2 hidden sm:inline">Pesquisar</span>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Introduza 9 dígitos e clique em Pesquisar
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="companyAddress">Morada</Label>
            <Textarea
              id="companyAddress"
              value={settings.company_address}
              onChange={(e) => setSettings({ ...settings, company_address: e.target.value })}
              placeholder="Rua..., 1000-000 Lisboa"
              rows={2}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="companyEmail">Email</Label>
              <Input
                id="companyEmail"
                type="email"
                value={settings.company_email}
                onChange={(e) => setSettings({ ...settings, company_email: e.target.value })}
                placeholder="faturacao@empresa.pt"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyPhone">Telefone</Label>
              <Input
                id="companyPhone"
                value={settings.company_phone}
                onChange={(e) => setSettings({ ...settings, company_phone: e.target.value })}
                placeholder="+351 912 345 678"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pagamento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Condições de Pagamento
          </CardTitle>
          <CardDescription>
            Defina os termos de pagamento padrão e dados bancários.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="paymentTerms">Prazo de Pagamento (dias)</Label>
              <Select
                value={settings.default_payment_terms.toString()}
                onValueChange={(v) => setSettings({ ...settings, default_payment_terms: parseInt(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Pronto pagamento</SelectItem>
                  <SelectItem value="7">7 dias</SelectItem>
                  <SelectItem value="15">15 dias</SelectItem>
                  <SelectItem value="30">30 dias</SelectItem>
                  <SelectItem value="45">45 dias</SelectItem>
                  <SelectItem value="60">60 dias</SelectItem>
                  <SelectItem value="90">90 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Moeda</Label>
              <Select
                value={settings.default_currency}
                onValueChange={(v) => setSettings({ ...settings, default_currency: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                  <SelectItem value="USD">USD - Dólar</SelectItem>
                  <SelectItem value="GBP">GBP - Libra</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bankName">Banco</Label>
              <Input
                id="bankName"
                value={settings.bank_name}
                onChange={(e) => setSettings({ ...settings, bank_name: e.target.value })}
                placeholder="Nome do Banco"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="iban">IBAN</Label>
              <Input
                id="iban"
                value={settings.iban}
                onChange={(e) => setSettings({ ...settings, iban: e.target.value })}
                placeholder="PT50..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lembretes e Email */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Lembretes e Email
          </CardTitle>
          <CardDescription>
            Configure os lembretes automáticos e templates de email.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enviar lembretes automáticos</Label>
              <p className="text-xs text-muted-foreground">
                Envia email antes do vencimento da fatura.
              </p>
            </div>
            <Switch
              checked={settings.send_reminders}
              onCheckedChange={(checked) => setSettings({ ...settings, send_reminders: checked })}
            />
          </div>
          
          {settings.send_reminders && (
            <div className="space-y-2">
              <Label htmlFor="reminderDays">Dias antes do vencimento</Label>
              <Select
                value={settings.reminder_days_before.toString()}
                onValueChange={(v) => setSettings({ ...settings, reminder_days_before: parseInt(v) })}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 dia</SelectItem>
                  <SelectItem value="3">3 dias</SelectItem>
                  <SelectItem value="7">7 dias</SelectItem>
                  <SelectItem value="14">14 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="emailSubject">Assunto do Email</Label>
            <Input
              id="emailSubject"
              value={settings.email_subject_template}
              onChange={(e) => setSettings({ ...settings, email_subject_template: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Variáveis: {"{invoice_number}"}, {"{company_name}"}, {"{client_name}"}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="emailBody">Corpo do Email</Label>
            <Textarea
              id="emailBody"
              value={settings.email_body_template}
              onChange={(e) => setSettings({ ...settings, email_body_template: e.target.value })}
              rows={6}
            />
            <p className="text-xs text-muted-foreground">
              Variáveis: {"{client_name}"}, {"{invoice_number}"}, {"{total}"}, {"{due_date}"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Aparência */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Aparência
          </CardTitle>
          <CardDescription>
            Personalize o aspeto das suas faturas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Mostrar logótipo</Label>
              <p className="text-xs text-muted-foreground">
                Inclui o logótipo da empresa na fatura.
              </p>
            </div>
            <Switch
              checked={settings.show_logo}
              onCheckedChange={(checked) => setSettings({ ...settings, show_logo: checked })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="footerText">Texto de Rodapé</Label>
            <Input
              id="footerText"
              value={settings.footer_text}
              onChange={(e) => setSettings({ ...settings, footer_text: e.target.value })}
              placeholder="Obrigado pela sua preferência!"
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} className="gap-2">
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Guardar Configurações
        </Button>
      </div>
    </div>
  );
}
