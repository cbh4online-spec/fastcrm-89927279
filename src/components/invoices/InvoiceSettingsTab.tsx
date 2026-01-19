import { useState } from "react";
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
import { toast } from "sonner";
import { 
  Settings, 
  FileText, 
  Mail, 
  Calendar, 
  DollarSign,
  Building2,
  Save,
  Bell,
  Palette
} from "lucide-react";

export function InvoiceSettingsTab() {
  const [settings, setSettings] = useState({
    // Numeração
    invoicePrefix: "FAT-",
    nextNumber: 1,
    
    // Dados da empresa
    companyName: "",
    companyNif: "",
    companyAddress: "",
    companyEmail: "",
    companyPhone: "",
    
    // Pagamento
    defaultPaymentTerms: 30,
    defaultCurrency: "EUR",
    bankName: "",
    iban: "",
    
    // Email
    sendReminders: true,
    reminderDaysBefore: 7,
    emailSubjectTemplate: "Fatura {invoice_number} - {company_name}",
    emailBodyTemplate: "Olá {client_name},\n\nSegue em anexo a fatura {invoice_number} no valor de {total}.\n\nData de vencimento: {due_date}\n\nObrigado pela preferência!",
    
    // Aparência
    showLogo: true,
    primaryColor: "#3b82f6",
    footerText: "Obrigado pela sua preferência!",
  });

  const handleSave = () => {
    // TODO: Save to database
    toast.success("Configurações guardadas com sucesso!");
  };

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
                value={settings.invoicePrefix}
                onChange={(e) => setSettings({ ...settings, invoicePrefix: e.target.value })}
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
                value={settings.nextNumber}
                onChange={(e) => setSettings({ ...settings, nextNumber: parseInt(e.target.value) || 1 })}
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
            Informações que aparecem nas suas faturas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="companyName">Nome da Empresa</Label>
              <Input
                id="companyName"
                value={settings.companyName}
                onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                placeholder="A sua empresa, Lda."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyNif">NIF</Label>
              <Input
                id="companyNif"
                value={settings.companyNif}
                onChange={(e) => setSettings({ ...settings, companyNif: e.target.value })}
                placeholder="123456789"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="companyAddress">Morada</Label>
            <Textarea
              id="companyAddress"
              value={settings.companyAddress}
              onChange={(e) => setSettings({ ...settings, companyAddress: e.target.value })}
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
                value={settings.companyEmail}
                onChange={(e) => setSettings({ ...settings, companyEmail: e.target.value })}
                placeholder="faturacao@empresa.pt"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyPhone">Telefone</Label>
              <Input
                id="companyPhone"
                value={settings.companyPhone}
                onChange={(e) => setSettings({ ...settings, companyPhone: e.target.value })}
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
                value={settings.defaultPaymentTerms.toString()}
                onValueChange={(v) => setSettings({ ...settings, defaultPaymentTerms: parseInt(v) })}
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
                value={settings.defaultCurrency}
                onValueChange={(v) => setSettings({ ...settings, defaultCurrency: v })}
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
                value={settings.bankName}
                onChange={(e) => setSettings({ ...settings, bankName: e.target.value })}
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
              checked={settings.sendReminders}
              onCheckedChange={(checked) => setSettings({ ...settings, sendReminders: checked })}
            />
          </div>
          
          {settings.sendReminders && (
            <div className="space-y-2">
              <Label htmlFor="reminderDays">Dias antes do vencimento</Label>
              <Select
                value={settings.reminderDaysBefore.toString()}
                onValueChange={(v) => setSettings({ ...settings, reminderDaysBefore: parseInt(v) })}
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
              value={settings.emailSubjectTemplate}
              onChange={(e) => setSettings({ ...settings, emailSubjectTemplate: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Variáveis: {"{invoice_number}"}, {"{company_name}"}, {"{client_name}"}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="emailBody">Corpo do Email</Label>
            <Textarea
              id="emailBody"
              value={settings.emailBodyTemplate}
              onChange={(e) => setSettings({ ...settings, emailBodyTemplate: e.target.value })}
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
              checked={settings.showLogo}
              onCheckedChange={(checked) => setSettings({ ...settings, showLogo: checked })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="footerText">Texto de Rodapé</Label>
            <Input
              id="footerText"
              value={settings.footerText}
              onChange={(e) => setSettings({ ...settings, footerText: e.target.value })}
              placeholder="Obrigado pela sua preferência!"
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} className="gap-2">
          <Save className="h-4 w-4" />
          Guardar Configurações
        </Button>
      </div>
    </div>
  );
}
