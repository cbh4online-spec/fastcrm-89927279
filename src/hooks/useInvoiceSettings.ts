import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface InvoiceSettings {
  id?: string;
  workspace_id?: string;
  invoice_prefix: string;
  next_number: number;
  company_name: string;
  company_nif: string;
  company_address: string;
  company_email: string;
  company_phone: string;
  company_logo_url: string | null;
  default_payment_terms: number;
  default_currency: string;
  bank_name: string;
  iban: string;
  send_reminders: boolean;
  reminder_days_before: number;
  email_subject_template: string;
  email_body_template: string;
  show_logo: boolean;
  primary_color: string;
  footer_text: string;
}

const defaultSettings: InvoiceSettings = {
  invoice_prefix: "FAT-",
  next_number: 1,
  company_name: "",
  company_nif: "",
  company_address: "",
  company_email: "",
  company_phone: "",
  company_logo_url: null,
  default_payment_terms: 30,
  default_currency: "EUR",
  bank_name: "",
  iban: "",
  send_reminders: true,
  reminder_days_before: 7,
  email_subject_template: "Fatura {invoice_number} - {company_name}",
  email_body_template: `Olá {client_name},

Segue em anexo a fatura {invoice_number} no valor de {total}.

Data de vencimento: {due_date}

Obrigado pela preferência!`,
  show_logo: true,
  primary_color: "#3b82f6",
  footer_text: "Obrigado pela sua preferência!",
};

export function useInvoiceSettings() {
  const { currentWorkspace } = useWorkspace();
  const [settings, setSettings] = useState<InvoiceSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (currentWorkspace?.id) {
      loadSettings();
    }
  }, [currentWorkspace?.id]);

  async function loadSettings() {
    if (!currentWorkspace?.id) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("invoice_settings")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          id: data.id,
          workspace_id: data.workspace_id,
          invoice_prefix: data.invoice_prefix || defaultSettings.invoice_prefix,
          next_number: data.next_number || defaultSettings.next_number,
          company_name: data.company_name || "",
          company_nif: data.company_nif || "",
          company_address: data.company_address || "",
          company_email: data.company_email || "",
          company_phone: data.company_phone || "",
          company_logo_url: data.company_logo_url,
          default_payment_terms: data.default_payment_terms || defaultSettings.default_payment_terms,
          default_currency: data.default_currency || defaultSettings.default_currency,
          bank_name: data.bank_name || "",
          iban: data.iban || "",
          send_reminders: data.send_reminders ?? defaultSettings.send_reminders,
          reminder_days_before: data.reminder_days_before || defaultSettings.reminder_days_before,
          email_subject_template: data.email_subject_template || defaultSettings.email_subject_template,
          email_body_template: data.email_body_template || defaultSettings.email_body_template,
          show_logo: data.show_logo ?? defaultSettings.show_logo,
          primary_color: data.primary_color || defaultSettings.primary_color,
          footer_text: data.footer_text || defaultSettings.footer_text,
        });
      }
    } catch (error) {
      console.error("Error loading invoice settings:", error);
      toast.error("Erro ao carregar configurações de fatura");
    } finally {
      setIsLoading(false);
    }
  }

  async function saveSettings(newSettings: Partial<InvoiceSettings>) {
    if (!currentWorkspace?.id) {
      toast.error("Workspace não encontrado");
      return false;
    }

    setIsSaving(true);
    try {
      const dataToSave = {
        workspace_id: currentWorkspace.id,
        invoice_prefix: newSettings.invoice_prefix,
        next_number: newSettings.next_number,
        company_name: newSettings.company_name,
        company_nif: newSettings.company_nif,
        company_address: newSettings.company_address,
        company_email: newSettings.company_email,
        company_phone: newSettings.company_phone,
        company_logo_url: newSettings.company_logo_url,
        default_payment_terms: newSettings.default_payment_terms,
        default_currency: newSettings.default_currency,
        bank_name: newSettings.bank_name,
        iban: newSettings.iban,
        send_reminders: newSettings.send_reminders,
        reminder_days_before: newSettings.reminder_days_before,
        email_subject_template: newSettings.email_subject_template,
        email_body_template: newSettings.email_body_template,
        show_logo: newSettings.show_logo,
        primary_color: newSettings.primary_color,
        footer_text: newSettings.footer_text,
      };

      const { error } = await supabase
        .from("invoice_settings")
        .upsert(dataToSave, { onConflict: "workspace_id" });

      if (error) throw error;

      setSettings(prev => ({ ...prev, ...newSettings }));
      toast.success("Configurações guardadas com sucesso!");
      return true;
    } catch (error) {
      console.error("Error saving invoice settings:", error);
      toast.error("Erro ao guardar configurações");
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function uploadLogo(file: File): Promise<string | null> {
    if (!currentWorkspace?.id) {
      toast.error("Workspace não encontrado");
      return null;
    }

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentWorkspace.id}/logo.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("company-logos")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("company-logos")
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast.error("Erro ao fazer upload do logótipo");
      return null;
    }
  }

  async function removeLogo() {
    if (!currentWorkspace?.id || !settings.company_logo_url) return;

    try {
      const fileName = `${currentWorkspace.id}/logo`;
      await supabase.storage.from("company-logos").remove([fileName]);
      setSettings(prev => ({ ...prev, company_logo_url: null }));
    } catch (error) {
      console.error("Error removing logo:", error);
    }
  }

  return {
    settings,
    setSettings,
    isLoading,
    isSaving,
    saveSettings,
    uploadLogo,
    removeLogo,
    loadSettings,
  };
}
