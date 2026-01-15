import { useState, useRef, useEffect } from "react";
import { useContacts } from "@/hooks/useContacts";
import { useContactEnrichment, type ContactEnrichmentResult } from "@/hooks/useContactEnrichment";
import { useContactDuplicateCheck, type DuplicateMatch } from "@/hooks/useContactDuplicates";
import { useNavigate } from "react-router-dom";
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
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CustomFieldsFormCreate, CustomFieldsFormCreateRef } from "@/components/custom-fields/CustomFieldsForm";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  Check, 
  X, 
  AlertTriangle,
  Building2,
  Briefcase,
  Globe,
  MessageSquare,
  Loader2,
  User,
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CreateContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function EnrichmentSuggestion({ 
  label, 
  field, 
  onAccept, 
  onReject 
}: { 
  label: string; 
  field: { value: string; confidence: "high" | "medium" | "low"; source: string }; 
  onAccept: () => void; 
  onReject: () => void;
}) {
  const confidenceColors = {
    high: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    low: "bg-slate-100 text-slate-600 dark:bg-slate-800/30 dark:text-slate-400",
  };

  return (
    <div className="flex items-center justify-between py-2 px-3 bg-primary/5 rounded-md">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{label}:</span>
          <span className="text-sm font-medium truncate">{field.value}</span>
          <Badge variant="secondary" className={cn("text-[10px] h-5", confidenceColors[field.confidence])}>
            {field.source}
          </Badge>
        </div>
      </div>
      <div className="flex items-center gap-1 ml-2">
        <Button variant="ghost" size="icon" className="h-6 w-6 text-green-600" onClick={onAccept}>
          <Check className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={onReject}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

function DuplicateWarning({ 
  duplicates, 
  onUseExisting, 
  onContinue 
}: { 
  duplicates: DuplicateMatch[]; 
  onUseExisting: (id: string) => void; 
  onContinue: () => void;
}) {
  return (
    <Card className="p-3 border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            Possível duplicado encontrado
          </p>
          <div className="mt-2 space-y-2">
            {duplicates.slice(0, 2).map((dup) => (
              <div 
                key={dup.contact.id} 
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">{dup.contact.name}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {dup.matchType === "email" ? "Email" : dup.matchType === "phone" ? "Telefone" : "Nome similar"}
                  </Badge>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-xs shrink-0"
                  onClick={() => onUseExisting(dup.contact.id)}
                >
                  Usar este
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            ))}
          </div>
          <Button 
            variant="link" 
            size="sm" 
            className="h-auto p-0 mt-2 text-xs text-amber-700 dark:text-amber-300"
            onClick={onContinue}
          >
            Criar mesmo assim
          </Button>
        </div>
      </div>
    </Card>
  );
}

export function CreateContactDialog({ open, onOpenChange }: CreateContactDialogProps) {
  const navigate = useNavigate();
  const { createContact } = useContacts();
  const enrichContact = useContactEnrichment();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOptional, setShowOptional] = useState(false);
  const [showEnrichPrompt, setShowEnrichPrompt] = useState(false);
  const [enrichmentResult, setEnrichmentResult] = useState<ContactEnrichmentResult | null>(null);
  const [isEnriching, setIsEnriching] = useState(false);
  const [dismissedDuplicates, setDismissedDuplicates] = useState(false);
  const customFieldsRef = useRef<CustomFieldsFormCreateRef>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    job_title: "",
    notes: "",
    tags: "",
  });

  // Check for duplicates
  const { data: duplicates = [] } = useContactDuplicateCheck(
    formData.name,
    formData.email,
    formData.phone
  );

  // Show enrich prompt when email or phone is entered
  useEffect(() => {
    const hasContact = formData.email.includes("@") || formData.phone.length >= 9;
    if (hasContact && !enrichmentResult && !isEnriching) {
      setShowEnrichPrompt(true);
    } else if (!hasContact) {
      setShowEnrichPrompt(false);
    }
  }, [formData.email, formData.phone, enrichmentResult, isEnriching]);

  const handleEnrich = async () => {
    setIsEnriching(true);
    setShowEnrichPrompt(false);
    
    try {
      const result = await enrichContact.mutateAsync({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
      });
      
      if (result) {
        setEnrichmentResult(result);
        toast.success("Dados enriquecidos com sucesso");
      }
    } catch (error) {
      toast.error("Erro ao enriquecer dados");
    } finally {
      setIsEnriching(false);
    }
  };

  const handleAcceptEnrichment = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Remove from enrichment result
    if (enrichmentResult) {
      const newResult = { ...enrichmentResult };
      if (field === "company") delete newResult.company;
      if (field === "job_title") delete newResult.jobTitle;
      setEnrichmentResult(Object.keys(newResult).length > 0 ? newResult : null);
    }
  };

  const handleRejectEnrichment = (field: string) => {
    if (enrichmentResult) {
      const newResult = { ...enrichmentResult };
      if (field === "company") delete newResult.company;
      if (field === "jobTitle") delete newResult.jobTitle;
      if (field === "preferredChannel") delete newResult.preferredChannel;
      if (field === "country") delete newResult.country;
      setEnrichmentResult(Object.keys(newResult).length > 0 ? newResult : null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate at least one field
    const hasName = formData.name.trim();
    const hasEmail = formData.email.trim();
    const hasPhone = formData.phone.trim();
    
    if (!hasName && !hasEmail && !hasPhone) {
      toast.error("Preencha pelo menos nome, email ou telefone");
      return;
    }

    // Check for duplicates
    if (duplicates.length > 0 && !dismissedDuplicates) {
      return; // Show duplicate warning
    }

    setIsSubmitting(true);
    try {
      const result = await createContact.mutateAsync({
        name: formData.name.trim() || formData.email.split("@")[0] || "Contacto",
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        company: formData.company.trim() || undefined,
        job_title: formData.job_title.trim() || undefined,
        notes: formData.notes.trim() || undefined,
        tags: formData.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      });
      
      // Save custom fields if any
      if (result?.id && customFieldsRef.current) {
        await customFieldsRef.current.saveCustomFields(result.id);
      }
      
      resetForm();
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      company: "",
      job_title: "",
      notes: "",
      tags: "",
    });
    setEnrichmentResult(null);
    setShowEnrichPrompt(false);
    setShowOptional(false);
    setDismissedDuplicates(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  const handleUseExisting = (contactId: string) => {
    onOpenChange(false);
    navigate(`/dashboard/contacts/${contactId}`);
  };

  const hasMinimumInput = formData.name.trim() || formData.email.trim() || formData.phone.trim();

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Contacto</DialogTitle>
          <DialogDescription>
            Preencha pelo menos nome, email ou telefone. O resto é completado automaticamente.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Primary Fields */}
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="João Silva"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="joao@empresa.pt"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+351 912 345 678"
                />
              </div>
            </div>
          </div>

          {/* Enrich Prompt */}
          {showEnrichPrompt && !isEnriching && (
            <Card className="p-3 border-primary/30 bg-primary/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-sm">Posso completar este contacto automaticamente. Queres?</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setShowEnrichPrompt(false)}>
                    Não
                  </Button>
                  <Button type="button" size="sm" onClick={handleEnrich}>
                    Sim
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Enriching Status */}
          {isEnriching && (
            <Card className="p-3 border-primary/30 bg-primary/5">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
                <span className="text-sm">A analisar informações…</span>
              </div>
            </Card>
          )}

          {/* Enrichment Suggestions */}
          {enrichmentResult && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Sugestões
              </p>
              <div className="space-y-1.5">
                {enrichmentResult.company && (
                  <EnrichmentSuggestion
                    label="Empresa"
                    field={enrichmentResult.company}
                    onAccept={() => handleAcceptEnrichment("company", enrichmentResult.company!.value)}
                    onReject={() => handleRejectEnrichment("company")}
                  />
                )}
                {enrichmentResult.jobTitle && (
                  <EnrichmentSuggestion
                    label="Cargo"
                    field={enrichmentResult.jobTitle}
                    onAccept={() => handleAcceptEnrichment("job_title", enrichmentResult.jobTitle!.value)}
                    onReject={() => handleRejectEnrichment("jobTitle")}
                  />
                )}
                {enrichmentResult.preferredChannel && (
                  <div className="flex items-center gap-2 py-2 px-3 bg-muted/50 rounded-md text-sm">
                    <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Canal preferido:</span>
                    <Badge variant="secondary">{enrichmentResult.preferredChannel.value}</Badge>
                  </div>
                )}
                {enrichmentResult.country && (
                  <div className="flex items-center gap-2 py-2 px-3 bg-muted/50 rounded-md text-sm">
                    <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">País:</span>
                    <span>{enrichmentResult.country.value}</span>
                    {enrichmentResult.language && (
                      <>
                        <span className="text-muted-foreground">•</span>
                        <span>{enrichmentResult.language.value}</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Duplicate Warning */}
          {duplicates.length > 0 && !dismissedDuplicates && (
            <DuplicateWarning
              duplicates={duplicates}
              onUseExisting={handleUseExisting}
              onContinue={() => setDismissedDuplicates(true)}
            />
          )}

          {/* Optional Fields */}
          <Collapsible open={showOptional} onOpenChange={setShowOptional}>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="w-full justify-between">
                Campos opcionais
                {showOptional ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-2">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="company" className="flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5" />
                    Empresa
                  </Label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    placeholder="Empresa XYZ"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="job_title" className="flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5" />
                    Cargo
                  </Label>
                  <Input
                    id="job_title"
                    value={formData.job_title}
                    onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                    placeholder="Diretor Comercial"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="cliente, vip, parceiro"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notas</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Informações adicionais sobre o contacto..."
                  rows={3}
                />
              </div>
              
              {/* Custom Fields */}
              <CustomFieldsFormCreate
                ref={customFieldsRef}
                entityType="contact"
              />
            </CollapsibleContent>
          </Collapsible>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !hasMinimumInput || (duplicates.length > 0 && !dismissedDuplicates)}
            >
              {isSubmitting ? "A criar..." : "Criar Contacto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
