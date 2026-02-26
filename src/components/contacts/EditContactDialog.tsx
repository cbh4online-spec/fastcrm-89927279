import { useState, useEffect, useRef, useCallback } from "react";
import { useContacts, Contact } from "@/hooks/useContacts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CustomFieldsForm } from "@/components/custom-fields/CustomFieldsForm";
import { AIAutofillPreviewDialog, type AIAutofillResult } from "@/components/custom-fields/AIAutofillPreviewDialog";
import { SocialMediaFields } from "@/components/shared/SocialMediaFields";
import { useManagedFields } from "@/hooks/useManagedFields";
import { supabase } from "@/integrations/supabase/client";
import { useSetCustomFieldValue } from "@/hooks/useCustomFields";
import { useQueryClient } from "@tanstack/react-query";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface EditContactDialogProps {
  contact: Contact;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditContactDialog({ contact, open, onOpenChange }: EditContactDialogProps) {
  const { updateContact } = useContacts();
  const { data: managedFields = [] } = useManagedFields('contact' as any);
  const setFieldValue = useSetCustomFieldValue();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [previewResults, setPreviewResults] = useState<AIAutofillResult[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [isApplyingPreview, setIsApplyingPreview] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    job_title: "",
    notes: "",
    tags: "",
    linkedin_url: "",
    facebook_url: "",
    instagram_url: "",
    twitter_url: "",
  });

  useEffect(() => {
    if (contact) {
      setFormData({
        name: contact.name,
        email: contact.email || "",
        phone: contact.phone || "",
        company: contact.company || "",
        job_title: contact.job_title || "",
        notes: contact.notes || "",
        tags: contact.tags?.join(", ") || "",
        linkedin_url: contact.linkedin_url || "",
        facebook_url: contact.facebook_url || "",
        instagram_url: contact.instagram_url || "",
        twitter_url: contact.twitter_url || "",
      });
    }
  }, [contact]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsSubmitting(true);
    try {
      await updateContact.mutateAsync({
        id: contact.id,
        name: formData.name.trim(),
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        company: formData.company.trim() || undefined,
        job_title: formData.job_title.trim() || undefined,
        notes: formData.notes.trim() || undefined,
        tags: formData.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        linkedin_url: formData.linkedin_url.trim() || undefined,
        facebook_url: formData.facebook_url.trim() || undefined,
        instagram_url: formData.instagram_url.trim() || undefined,
        twitter_url: formData.twitter_url.trim() || undefined,
      });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSocialChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleAIAutofill = useCallback(async () => {
    const autofillFields = managedFields.filter(
      (mf) => mf.formatting_config?.ai_autofill_enabled
    );
    if (autofillFields.length === 0) {
      toast.info("Nenhum campo configurado para AI autofill");
      return;
    }

    setIsAutoFilling(true);
    const toastId = toast.loading(`A gerar ${autofillFields.length} campo(s) com IA...`);
    const results: AIAutofillResult[] = [];

    const recordData = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      company: formData.company,
      job_title: formData.job_title,
      notes: formData.notes,
    };

    for (const mf of autofillFields) {
      try {
        const { data, error } = await supabase.functions.invoke("ai-autofill-field", {
          body: {
            field_config: {
              ai_autofill_type: mf.formatting_config.ai_autofill_type || "generate",
              ai_autofill_guidance: mf.formatting_config.ai_autofill_guidance,
            },
            record_data: recordData,
            field_name: mf.label || mf.name,
          },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        if (data?.value) {
          results.push({
            fieldId: mf.id,
            fieldName: mf.name,
            fieldLabel: mf.label || mf.name,
            generatedValue: data.value,
            isUnique: mf.is_unique,
          });
        }
      } catch (err) {
        console.error(`AI autofill failed for ${mf.name}:`, err);
      }
    }

    toast.dismiss(toastId);
    setIsAutoFilling(false);

    if (results.length > 0) {
      setPreviewResults(results);
      setShowPreview(true);
    } else {
      toast.info("Nenhum campo preenchido");
    }
  }, [managedFields, formData]);

  const handleApplyPreview = useCallback(async (selectedResults: AIAutofillResult[]) => {
    setIsApplyingPreview(true);
    let filled = 0;
    for (const result of selectedResults) {
      try {
        await setFieldValue.mutateAsync({
          customFieldId: result.fieldId,
          entityId: contact.id,
          value: result.generatedValue,
          fieldName: result.fieldName,
          isUnique: result.isUnique,
          origin: 'ai',
        });
        filled++;
      } catch (err) {
        console.error(`Failed to save ${result.fieldName}:`, err);
      }
    }
    setIsApplyingPreview(false);
    setShowPreview(false);
    setPreviewResults([]);
    if (filled > 0) {
      toast.success(`${filled} campo(s) preenchido(s) com IA`);
      queryClient.invalidateQueries({ queryKey: ["custom_field_values", contact.id] });
    }
  }, [setFieldValue, contact.id, queryClient]);

  const hasAIFields = managedFields.some((mf) => mf.formatting_config?.ai_autofill_enabled);

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Contacto</DialogTitle>
          <DialogDescription>
            Atualize as informações do contacto.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="João Silva"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="joao@empresa.pt"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Telefone</Label>
              <Input
                id="edit-phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+351 912 345 678"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-company">Empresa</Label>
              <Input
                id="edit-company"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                placeholder="Empresa XYZ"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="edit-job_title">Cargo</Label>
              <Input
                id="edit-job_title"
                value={formData.job_title}
                onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                placeholder="Diretor Comercial"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="edit-tags">Tags (separadas por vírgula)</Label>
              <Input
                id="edit-tags"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="cliente, vip, parceiro"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="edit-notes">Notas</Label>
              <Textarea
                id="edit-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Informações adicionais sobre o contacto..."
                rows={3}
              />
            </div>
            
            {/* Social Media Fields */}
            <div className="sm:col-span-2 pt-2 border-t">
              <SocialMediaFields
                linkedinUrl={formData.linkedin_url}
                facebookUrl={formData.facebook_url}
                instagramUrl={formData.instagram_url}
                twitterUrl={formData.twitter_url}
                onChange={handleSocialChange}
              />
            </div>
            
            {/* Custom Fields */}
            <div className="sm:col-span-2 pt-2 border-t">
              <CustomFieldsForm entityType="contact" entityId={contact.id} />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {hasAIFields && (
              <Button
                type="button"
                variant="outline"
                onClick={handleAIAutofill}
                disabled={isAutoFilling}
                className="mr-auto"
              >
                {isAutoFilling ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                Preencher com IA
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.name.trim()}>
              {isSubmitting ? "A guardar..." : "Guardar Alterações"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    <AIAutofillPreviewDialog
      open={showPreview}
      onOpenChange={setShowPreview}
      results={previewResults}
      onConfirm={handleApplyPreview}
      isApplying={isApplyingPreview}
    />
    </>
  );
}
