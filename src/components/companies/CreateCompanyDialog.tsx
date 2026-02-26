import { useState, useRef, useEffect } from "react";
import { useCompanies } from "@/hooks/useCompanies";
import { useContacts } from "@/hooks/useContacts";
import { useCompanyEnrichment, EnrichmentResult } from "@/hooks/useCompanyEnrichment";
import { useCompanyDuplicateCheck, DuplicateMatch } from "@/hooks/useCompanyDuplicates";
import { useNifLookup, NifLookupResult } from "@/hooks/useNifLookup";
import { isIndividualNif, getEntityTypeFromNif } from "@/hooks/useCompanyContacts";
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
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CustomFieldsFormCreate, CustomFieldsFormCreateRef } from "@/components/custom-fields/CustomFieldsForm";
import {
  Building2,
  Globe,
  Mail,
  ChevronDown,
  Sparkles,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Link2,
  Phone,
  Tag,
  Search,
  X,
  Plus,
  User,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface CreateCompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const confidenceColors = {
  high: "text-green-600 bg-green-50 border-green-200",
  medium: "text-yellow-600 bg-yellow-50 border-yellow-200",
  low: "text-red-600 bg-red-50 border-red-200",
};

export function CreateCompanyDialog({ open, onOpenChange }: CreateCompanyDialogProps) {
  const navigate = useNavigate();
  const { createCompany } = useCompanies();
  const { createContact } = useContacts();
  const enrichment = useCompanyEnrichment();
  const nifLookup = useNifLookup({ showToasts: false });
  const customFieldsPrimaryRef = useRef<CustomFieldsFormCreateRef>(null);
  const customFieldsSecondaryRef = useRef<CustomFieldsFormCreateRef>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [enrichmentData, setEnrichmentData] = useState<EnrichmentResult | null>(null);
  const [enrichmentStarted, setEnrichmentStarted] = useState(false);
  const [selectedDuplicate, setSelectedDuplicate] = useState<DuplicateMatch | null>(null);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [createAssociatedContact, setCreateAssociatedContact] = useState(false);
  const [isIndividual, setIsIndividual] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    website: "",
    email: "",
    phone: "",
    notes: "",
    tags: "",
    tax_id: "",
    address: "",
    postal_code: "",
    city: "",
    cae_codes: [] as string[],
    cae_description: "",
    company_status: "",
    legal_nature: "",
    capital_social: "",
    founding_date: "",
    region: "",
    county: "",
    parish: "",
    fax: "",
  });

  // Enriched fields that user can confirm
  const [enrichedFields, setEnrichedFields] = useState<{
    industry?: string;
    size?: string;
    phone?: string;
    email?: string;
    address?: string;
    description?: string;
  }>({});

  // Track which enriched fields user has accepted
  const [acceptedFields, setAcceptedFields] = useState<Set<string>>(new Set());

  // Duplicate detection
  const { data: duplicates = [] } = useCompanyDuplicateCheck(
    formData.name,
    formData.website,
    formData.email
  );

  const canEnrich = formData.website.trim() || formData.email.trim();
  const hasValidInput = formData.name.trim() && (formData.website.trim() || formData.email.trim());

  // Trigger enrichment when user stops typing
  useEffect(() => {
    if (!canEnrich || enrichmentStarted) return;

    const timeout = setTimeout(() => {
      // Don't auto-start, wait for user to click
    }, 1000);

    return () => clearTimeout(timeout);
  }, [formData.website, formData.email]);

  const handleEnrich = async () => {
    if (!canEnrich) return;

    setEnrichmentStarted(true);
    const result = await enrichment.mutateAsync({
      website: formData.website.trim() || undefined,
      email: formData.email.trim() || undefined,
      companyName: formData.name.trim() || undefined,
    });

    if (result) {
      setEnrichmentData(result);
      
      // Pre-populate enriched fields for user to confirm
      const newEnrichedFields: typeof enrichedFields = {};
      if (result.industry?.value) newEnrichedFields.industry = result.industry.value;
      if (result.size?.value) newEnrichedFields.size = result.size.value;
      if (result.phone?.value && !formData.phone) newEnrichedFields.phone = result.phone.value;
      if (result.email?.value && !formData.email) newEnrichedFields.email = result.email.value;
      if (result.address?.value) newEnrichedFields.address = result.address.value;
      if (result.description?.value) newEnrichedFields.description = result.description.value;
      
      setEnrichedFields(newEnrichedFields);
    }
  };

  const toggleAcceptField = (fieldName: string) => {
    setAcceptedFields((prev) => {
      const next = new Set(prev);
      if (next.has(fieldName)) {
        next.delete(fieldName);
      } else {
        next.add(fieldName);
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent, withEnrich = false) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    // Check duplicates first
    if (duplicates.length > 0 && !selectedDuplicate) {
      setShowDuplicateDialog(true);
      return;
    }

    // If user selected to use existing company, navigate there
    if (selectedDuplicate) {
      navigate(`/dashboard/companies/${selectedDuplicate.company.id}`);
      onOpenChange(false);
      return;
    }

    if (withEnrich && canEnrich && !enrichmentData) {
      await handleEnrich();
    }

    setIsSubmitting(true);
    try {
      // Determine entity type based on NIF
      const entityType = formData.tax_id ? getEntityTypeFromNif(formData.tax_id) : 'company';

      // Build final data with accepted enriched fields
      const finalData: Record<string, unknown> = {
        name: formData.name.trim(),
        tax_id: formData.tax_id.trim() || undefined,
        website: formData.website.trim() || undefined,
        email: formData.email.trim() || (acceptedFields.has("email") ? enrichedFields.email : undefined),
        phone: formData.phone.trim() || (acceptedFields.has("phone") ? enrichedFields.phone : undefined),
        notes: formData.notes.trim() || (acceptedFields.has("description") ? enrichedFields.description : undefined),
        address: formData.address.trim() || (acceptedFields.has("address") ? enrichedFields.address : undefined),
        entity_type: entityType,
        tags: formData.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      };

      if (acceptedFields.has("industry") && enrichedFields.industry) {
        finalData.industry = enrichedFields.industry;
      }
      if (acceptedFields.has("size") && enrichedFields.size) {
        finalData.size = enrichedFields.size;
      }

      const result = await createCompany.mutateAsync(finalData as any);

      // Save custom fields if any (from both primary and secondary refs)
      if (result?.id) {
        await customFieldsPrimaryRef.current?.saveCustomFields(result.id);
        await customFieldsSecondaryRef.current?.saveCustomFields(result.id);
        // Run AI autofill asynchronously
        const aiRecordData = {
          name: formData.name,
          website: formData.website,
          email: formData.email,
          phone: formData.phone,
          tax_id: formData.tax_id,
          address: formData.address,
          notes: formData.notes,
        };
        customFieldsPrimaryRef.current?.runAIAutofill(result.id, aiRecordData);
        customFieldsSecondaryRef.current?.runAIAutofill(result.id, aiRecordData);
      }

      // Create associated contact if checkbox is checked (forced for ENI)
      const shouldCreateContact = createAssociatedContact || isIndividual;
      if (result?.id && shouldCreateContact) {
        try {
          await createContact.mutateAsync({
            name: formData.name.trim(),
            email: formData.email.trim() || undefined,
            phone: formData.phone.trim() || undefined,
            company: formData.name.trim(),
            company_id: result.id,
            is_primary_contact: true,
            tax_id: isIndividual ? formData.tax_id.trim() : undefined,
            job_title: isIndividual ? "Empresário em Nome Individual" : undefined,
          });
          if (isIndividual) {
            toast.success("Empresário individual e contacto criados automaticamente");
          } else {
            toast.success("Empresa e contacto criados com sucesso");
          }
        } catch (error) {
          console.error("Error creating associated contact:", error);
          toast.success("Empresa criada. Erro ao criar contacto associado.");
        }
      } else {
        toast.success("Empresa criada com sucesso");
      }

      resetForm();
      onOpenChange(false);
      
      // Navigate to the new company
      if (result?.id) {
        navigate(`/dashboard/companies/${result.id}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      website: "",
      email: "",
      phone: "",
      notes: "",
      tags: "",
      tax_id: "",
      address: "",
      postal_code: "",
      city: "",
      cae_codes: [],
      cae_description: "",
      company_status: "",
      legal_nature: "",
      capital_social: "",
      founding_date: "",
      region: "",
      county: "",
      parish: "",
      fax: "",
    });
    setEnrichmentData(null);
    setEnrichedFields({});
    setAcceptedFields(new Set());
    setEnrichmentStarted(false);
    setSelectedDuplicate(null);
    setShowOptionalFields(false);
    setCreateAssociatedContact(false);
    setIsIndividual(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  const handleUseDuplicate = (duplicate: DuplicateMatch) => {
    setSelectedDuplicate(duplicate);
    setShowDuplicateDialog(false);
  };

  const handleCreateAnyway = () => {
    setShowDuplicateDialog(false);
    // Continue with create
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Nova Empresa
            </DialogTitle>
            <DialogDescription>
              Introduz o nome e website ou email. Eu preencho o resto por ti. ✨
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-4">
            {/* Required Fields */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Empresa *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Acme Corporation"
                  required
                  autoFocus
                />
              </div>

              {/* NIF Lookup Section */}
              <div className="space-y-2">
                <Label htmlFor="tax_id" className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  NIF
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="tax_id"
                    value={formData.tax_id}
                    onChange={(e) => setFormData({ ...formData, tax_id: e.target.value.replace(/\D/g, '').slice(0, 9) })}
                    placeholder="Número de identificação fiscal"
                    maxLength={9}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={async () => {
                      const result = await nifLookup.lookup(formData.tax_id);
                      if (result) {
                        setFormData(prev => ({
                          ...prev,
                          name: result.company_name || prev.name,
                          website: result.website || prev.website,
                          email: result.email || prev.email,
                          phone: result.phone || prev.phone,
                          address: result.address || prev.address,
                          postal_code: result.postal_code || prev.postal_code,
                          city: result.city || prev.city,
                          cae_codes: result.cae_codes || prev.cae_codes,
                          cae_description: result.cae_description || prev.cae_description,
                          company_status: result.company_status || prev.company_status,
                          legal_nature: result.legal_nature || prev.legal_nature,
                          capital_social: result.capital_social || prev.capital_social,
                          founding_date: result.founding_date || prev.founding_date,
                          region: result.region || prev.region,
                          county: result.county || prev.county,
                          parish: result.parish || prev.parish,
                          fax: result.fax || prev.fax,
                        }));
                        setShowOptionalFields(true);
                        
                        // Check if it's an individual NIF
                        const individual = isIndividualNif(formData.tax_id);
                        setIsIndividual(individual);
                        if (individual) {
                          setCreateAssociatedContact(true);
                        }
                      }
                    }}
                    disabled={nifLookup.isLoading || formData.tax_id.length !== 9}
                  >
                    {nifLookup.isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-2" />
                        Pesquisar
                      </>
                    )}
                  </Button>
                </div>
                {nifLookup.status !== "idle" && nifLookup.message && (
                  <Alert variant={nifLookup.status === "success" ? "default" : "destructive"} className="mt-2">
                    <AlertDescription>{nifLookup.message}</AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="website" className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Website
                  </Label>
                  <Input
                    id="website"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="www.empresa.pt"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="geral@empresa.pt"
                  />
                </div>
              </div>

              {/* Create Associated Contact Option - ENI Visual Enhancement */}
              {isIndividual ? (
                <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/30">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <User className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                        Empresário em Nome Individual Detectado
                      </span>
                      <Badge variant="outline" className="ml-auto border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-300">
                        ENI
                      </Badge>
                    </div>
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Este NIF pertence a uma pessoa singular com atividade comercial. 
                      Serão criados automaticamente:
                    </p>
                    <div className="flex flex-col gap-1 text-xs text-amber-700 dark:text-amber-300">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Registo de empresa (para faturação)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Registo de contacto com NIF (para comunicação)</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <Checkbox
                        id="createContact"
                        checked={true}
                        disabled
                        className="data-[state=checked]:bg-amber-600"
                      />
                      <label className="text-xs text-amber-600 dark:text-amber-400">
                        Contacto será criado automaticamente (obrigatório para ENI)
                      </label>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="flex items-start space-x-3 py-3 px-4 rounded-lg border border-border/50 bg-muted/30">
                  <Checkbox
                    id="createContact"
                    checked={createAssociatedContact}
                    onCheckedChange={(checked) => setCreateAssociatedContact(checked === true)}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label
                      htmlFor="createContact"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
                    >
                      <UserPlus className="w-4 h-4" />
                      Criar contacto associado automaticamente
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Cria um contacto principal vinculado a esta empresa.
                    </p>
                  </div>
                </div>
              )}

              {/* Enrichment CTA */}
              {canEnrich && !enrichmentData && !enrichment.isPending && (
                <Card className="border-primary/30 bg-primary/5">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Sparkles className="w-5 h-5 text-primary" />
                        <div>
                          <p className="text-sm font-medium">
                            Se quiseres, eu preencho isto por ti.
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Vou buscar informação ao website.
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleEnrich}
                        className="shrink-0"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Enriquecer
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Enrichment Loading */}
              {enrichment.isPending && (
                <Card className="border-primary/30 bg-primary/5">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-5 h-5 text-primary animate-spin" />
                      <p className="text-sm">A analisar o website...</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Enrichment Results */}
              {enrichmentData && Object.keys(enrichedFields).length > 0 && (
                <Card className="border-green-200 bg-green-50/50">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <p className="text-sm font-medium text-green-700">
                        Encontrei estes dados. Confirmas?
                      </p>
                    </div>
                    <div className="grid gap-2">
                      {Object.entries(enrichedFields).map(([key, value]) => {
                        if (!value) return null;
                        const field = enrichmentData[key as keyof EnrichmentResult];
                        const confidence = (field as any)?.confidence || "medium";
                        const isAccepted = acceptedFields.has(key);

                        const labels: Record<string, string> = {
                          industry: "Indústria",
                          size: "Tamanho",
                          phone: "Telefone",
                          email: "Email",
                          address: "Morada",
                          description: "Descrição",
                        };

                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => toggleAcceptField(key)}
                            className={cn(
                              "flex items-center justify-between p-2 rounded-md border text-left transition-colors",
                              isAccepted
                                ? "bg-green-100 border-green-300"
                                : "bg-white border-border hover:border-primary/50"
                            )}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-muted-foreground">{labels[key] || key}</p>
                              <p className="text-sm truncate">{value}</p>
                            </div>
                            <div className="flex items-center gap-2 ml-2">
                              <Badge
                                variant="outline"
                                className={cn("text-xs", confidenceColors[confidence])}
                              >
                                {confidence === "high" ? "Alta" : confidence === "medium" ? "Média" : "Baixa"}
                              </Badge>
                              {isAccepted && (
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    {enrichmentData.socialLinks && Object.keys(enrichmentData.socialLinks).length > 0 && (
                      <div className="pt-2 border-t border-green-200">
                        <p className="text-xs text-muted-foreground mb-2">Redes sociais encontradas:</p>
                        <div className="flex gap-2 flex-wrap">
                          {Object.entries(enrichmentData.socialLinks).map(([platform, url]) => (
                            <a
                              key={platform}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline flex items-center gap-1"
                            >
                              <Link2 className="w-3 h-3" />
                              {platform}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Duplicate Warning */}
              {duplicates.length > 0 && (
                <Card className="border-yellow-200 bg-yellow-50/50">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                      <div className="space-y-2 flex-1">
                        <p className="text-sm font-medium text-yellow-700">
                          Possível duplicado encontrado
                        </p>
                        {duplicates.slice(0, 2).map((dup) => (
                          <div
                            key={dup.company.id}
                            className="flex items-center justify-between p-2 bg-white rounded border border-yellow-200"
                          >
                            <div>
                              <p className="text-sm font-medium">{dup.company.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {dup.matchType === "domain" && "Mesmo domínio"}
                                {dup.matchType === "name" && `Nome similar (${Math.round(dup.similarity * 100)}%)`}
                                {dup.matchType === "email_domain" && "Mesmo domínio de email"}
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleUseDuplicate(dup)}
                            >
                              Usar esta
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Primary Custom Fields (position 0-1) - shown outside collapsible */}
            <CustomFieldsFormCreate 
              ref={customFieldsPrimaryRef} 
              entityType="company" 
              positionFilter="primary"
            />

            {/* Optional Fields - Collapsible */}
            <Collapsible open={showOptionalFields} onOpenChange={setShowOptionalFields}>
              <CollapsibleTrigger asChild>
                <Button type="button" variant="ghost" className="w-full justify-between">
                  Campos opcionais
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 transition-transform",
                      showOptionalFields && "rotate-180"
                    )}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-2">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      Telefone
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+351 21 123 4567"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tags" className="flex items-center gap-2">
                      <Tag className="w-4 h-4" />
                      Tags
                    </Label>
                    <Input
                      id="tags"
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      placeholder="parceiro, premium"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notas</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Informações adicionais..."
                    rows={2}
                  />
                </div>
                {/* Secondary Custom Fields (position > 1) */}
                <CustomFieldsFormCreate 
                  ref={customFieldsSecondaryRef} 
                  entityType="company" 
                  positionFilter="secondary"
                  hideLabel
                />
              </CollapsibleContent>
            </Collapsible>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              {canEnrich ? (
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    variant="outline"
                    disabled={isSubmitting || !formData.name.trim()}
                  >
                    Criar agora
                  </Button>
                  <Button
                    type="button"
                    onClick={(e) => handleSubmit(e, true)}
                    disabled={isSubmitting || !formData.name.trim()}
                    className="gap-2"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    Criar & Enriquecer
                  </Button>
                </div>
              ) : (
                <Button
                  type="submit"
                  disabled={isSubmitting || !formData.name.trim()}
                >
                  {isSubmitting ? "A criar..." : "Criar Empresa"}
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Duplicate Confirmation Dialog */}
      <AlertDialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Possível duplicado</AlertDialogTitle>
            <AlertDialogDescription>
              Encontrámos empresas similares. Queres usar uma existente ou criar uma nova?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 my-4">
            {duplicates.map((dup) => (
              <Card
                key={dup.company.id}
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => handleUseDuplicate(dup)}
              >
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{dup.company.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {dup.company.website || dup.company.email || "Sem contacto"}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {Math.round(dup.similarity * 100)}% similar
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCreateAnyway}>
              Criar nova empresa
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => setShowDuplicateDialog(false)}>
              Cancelar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
