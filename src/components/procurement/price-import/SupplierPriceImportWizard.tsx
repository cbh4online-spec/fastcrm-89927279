import React, { useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useSupplierImportV2 } from "@/hooks/useSupplierImportV2";
import { useSupplierImportProfiles } from "@/hooks/useSupplierImportProfiles";
import { useSuppliers } from "@/hooks/useProcurement";
import { PricingRulesPanel } from "./PricingRulesPanel";
import { ImportProfileSelector } from "./ImportProfileSelector";
import { ImportColumnMapper } from "./ImportColumnMapper";
import { ImportQualityGate } from "./ImportQualityGate";
import { ImportMatchReview } from "./ImportMatchReview";
import { ImportCommitPreview } from "./ImportCommitPreview";
import { ImportJobProgress } from "./ImportJobProgress";
import { ImportSummary } from "./ImportSummary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Upload, ArrowRight, ArrowLeft, Check, Loader2, FileSpreadsheet, AlertTriangle, Settings, Eye, ClipboardCheck, Zap, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const STEPS = [
  { label: "Fornecedor", icon: Settings },
  { label: "Upload", icon: Upload },
  { label: "Mapeamento", icon: FileSpreadsheet },
  { label: "Qualidade", icon: BarChart3 },
  { label: "Matching", icon: Eye },
  { label: "Impacto", icon: ClipboardCheck },
  { label: "Importar", icon: Zap },
  { label: "Resultado", icon: Check },
];

export function SupplierPriceImportWizard() {
  const { t } = useTranslation("procurement");
  const { currentWorkspace } = useWorkspace();
  const { data: suppliers } = useSuppliers(currentWorkspace?.id);
  const importHook = useSupplierImportV2();

  const [step, setStep] = useState(0);
  const [supplierId, setSupplierId] = useState("");
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pricingMode, setPricingMode] = useState("NET_PRICE_ONLY");
  const [currency, setCurrency] = useState("EUR");
  const [globalDiscount, setGlobalDiscount] = useState<number | undefined>();
  const [marginPercent, setMarginPercent] = useState<number | undefined>();
  const [basePriceField, setBasePriceField] = useState("net_price");
  const [priceIsPerPack, setPriceIsPerPack] = useState(false);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [saveProfileDialog, setSaveProfileDialog] = useState(false);
  const [newProfileName, setNewProfileName] = useState("");

  const profilesHook = useSupplierImportProfiles(supplierId || undefined);

  // When a profile is selected, apply its settings
  const handleProfileSelect = useCallback((profileId: string | null) => {
    setSelectedProfileId(profileId);
    if (profileId) {
      const profile = profilesHook.profiles.find(p => p.id === profileId);
      if (profile) {
        setPricingMode(profile.pricing_mode);
        if (profile.global_discount_percent != null) setGlobalDiscount(profile.global_discount_percent);
        if (profile.margin_percent != null) setMarginPercent(profile.margin_percent);
        if (profile.base_price_field) setBasePriceField(profile.base_price_field);
        setPriceIsPerPack(profile.price_is_per_pack);
        if (profile.mapping_json && Object.keys(profile.mapping_json).length > 0) {
          setMapping(profile.mapping_json);
        }
      }
    }
  }, [profilesHook.profiles]);

  // Step 0 → 1: select supplier
  const handleNextFromSupplier = () => {
    if (!supplierId) { toast.error("Selecione um fornecedor"); return; }
    setStep(1);
  };

  // Step 1 → 2: upload & parse
  const handleUpload = async () => {
    if (!file || !supplierId) return;
    const selectedProfile = profilesHook.profiles.find(p => p.id === selectedProfileId);
    await importHook.uploadAndParse(supplierId, file, pricingMode, currency, {
      globalDiscountPercent: globalDiscount,
      marginPercent,
      basePriceField,
      priceIsPerPack,
      profileId: selectedProfileId || undefined,
      mappingJson: selectedProfile?.mapping_json && Object.keys(selectedProfile.mapping_json).length > 0
        ? selectedProfile.mapping_json : undefined,
    });
    // If profile had mapping, auto-apply
    if (selectedProfile?.mapping_json && Object.keys(selectedProfile.mapping_json).length > 0) {
      setMapping(selectedProfile.mapping_json);
    }
    setStep(2);
  };

  // Step 2 → 3+4: validate
  const handleValidate = async () => {
    const stats = await importHook.validate(mapping, pricingMode, {
      globalDiscountPercent: globalDiscount,
      marginPercent,
      basePriceField,
      priceIsPerPack,
    });
    setStep(4); // skip quality gate to go directly to match review (quality gate is shown inline)
  };

  // Step 5 → 6: commit
  const handleCommit = async () => {
    setStep(6);
    await importHook.commit();
    setStep(7);
  };

  // Save current mapping as profile
  const handleSaveProfile = async () => {
    if (!newProfileName.trim()) return;
    await profilesHook.createProfile({
      name: newProfileName.trim(),
      mapping_json: mapping,
      pricing_mode: pricingMode,
      global_discount_percent: globalDiscount ?? 0,
      margin_percent: marginPercent ?? 0,
      base_price_field: basePriceField,
      price_is_per_pack: priceIsPerPack,
    });
    setSaveProfileDialog(false);
    setNewProfileName("");
  };

  const handleFilterChange = useCallback((filter: string | undefined) => {
    importHook.loadPreviewRows(filter);
  }, [importHook.loadPreviewRows]);

  const isLoading = ["uploading", "parsing", "validating", "committing"].includes(importHook.status);

  const handleReset = () => {
    importHook.reset();
    setStep(0);
    setSupplierId("");
    setSelectedProfileId(null);
    setFile(null);
    setMapping({});
  };

  return (
    <div className="space-y-6">
      {/* Stepper */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {STEPS.map((s, i) => (
          <React.Fragment key={i}>
            <div className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap",
              i === step ? "bg-primary text-primary-foreground" :
              i < step ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            )}>
              <s.icon className="h-3.5 w-3.5" />
              {s.label}
            </div>
            {i < STEPS.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
          </React.Fragment>
        ))}
      </div>

      {/* Step 0: Supplier + Profile */}
      {step === 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Selecionar Fornecedor e Perfil</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Fornecedor</Label>
              <Select value={supplierId} onValueChange={v => { setSupplierId(v); setSelectedProfileId(null); }}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecionar fornecedor" /></SelectTrigger>
                <SelectContent>
                  {(suppliers || []).map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {supplierId && (
              <ImportProfileSelector
                profiles={profilesHook.profiles}
                loading={profilesHook.loading}
                selectedProfileId={selectedProfileId}
                onSelect={handleProfileSelect}
                onCreateNew={() => setSaveProfileDialog(true)}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Moeda</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <PricingRulesPanel
              pricingMode={pricingMode}
              onPricingModeChange={setPricingMode}
              globalDiscount={globalDiscount}
              onGlobalDiscountChange={setGlobalDiscount}
              marginPercent={marginPercent}
              onMarginPercentChange={setMarginPercent}
              basePriceField={basePriceField}
              onBasePriceFieldChange={setBasePriceField}
              priceIsPerPack={priceIsPerPack}
              onPriceIsPerPackChange={setPriceIsPerPack}
            />

            <Button onClick={handleNextFromSupplier} disabled={!supplierId} className="w-full">
              Avançar <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 1: Upload */}
      {step === 1 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Upload de Ficheiro</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed rounded-lg border-border/50">
              <Upload className="h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-2">Arraste ou selecione um ficheiro CSV ou Excel</p>
              <Input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={e => setFile(e.target.files?.[0] || null)}
                className="max-w-xs"
              />
              {file && (
                <div className="mt-3 flex gap-2">
                  <Badge variant="outline">{file.name}</Badge>
                  <Badge variant="secondary">{(file.size / 1024).toFixed(0)} KB</Badge>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(0)}><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Button>
              <Button onClick={handleUpload} disabled={!file || isLoading} className="flex-1">
                {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> A processar...</> : "Upload e Detetar Colunas"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Column Mapping */}
      {step === 2 && (
        <div className="space-y-4">
          <ImportColumnMapper
            columns={importHook.columns}
            mapping={mapping}
            onMappingChange={setMapping}
            sampleRows={importHook.sampleRows}
          />

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Button>
            <Button variant="secondary" onClick={() => setSaveProfileDialog(true)}>
              Guardar como Perfil
            </Button>
            <Button onClick={handleValidate} disabled={isLoading} className="flex-1">
              {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> A validar...</> : "Validar e Fazer Matching"}
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Quality Gate (can also be shown inline with step 4) */}
      {step === 3 && (
        <div className="space-y-4">
          <ImportQualityGate
            totalRows={importHook.totalRows}
            parseErrors={importHook.parseErrors}
            stats={importHook.stats}
          />
          <Button onClick={() => setStep(4)} className="w-full">
            Avançar para Revisão <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}

      {/* Step 4: Match Review */}
      {step === 4 && (
        <div className="space-y-4">
          <ImportQualityGate
            totalRows={importHook.totalRows}
            parseErrors={importHook.parseErrors}
            stats={importHook.stats}
          />

          <ImportMatchReview
            previewRows={importHook.previewRows}
            stats={importHook.stats}
            onMatchUpdate={importHook.updateRowMatch}
            onFilterChange={handleFilterChange}
            workspaceId={currentWorkspace?.id || ""}
          />

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(2)}><ArrowLeft className="h-4 w-4 mr-1" /> Voltar ao Mapping</Button>
            <Button
              onClick={() => setStep(5)}
              disabled={(importHook.stats?.matched ?? 0) === 0}
              className="flex-1"
            >
              Avançar para Impacto <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 5: Commit Preview */}
      {step === 5 && (
        <div className="space-y-4">
          <ImportCommitPreview stats={importHook.stats} />

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(4)}><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Button>
            <Button onClick={handleCommit} disabled={isLoading} className="flex-1">
              {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> A importar...</> :
                `Confirmar Importação (${importHook.stats?.matched ?? 0} produtos)`}
            </Button>
          </div>
        </div>
      )}

      {/* Step 6: Committing */}
      {step === 6 && (
        <ImportJobProgress
          currentStep={importHook.currentStep}
          progressPercent={importHook.progressPercent}
        />
      )}

      {/* Step 7: Summary */}
      {step === 7 && (
        <ImportSummary
          commitStats={importHook.commitStats}
          onReset={handleReset}
        />
      )}

      {/* Error state */}
      {importHook.status === "error" && step >= 6 && (
        <Card>
          <CardContent className="text-center py-8 space-y-3">
            <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
            <p className="text-sm text-destructive">Ocorreu um erro durante a importação.</p>
            <Button onClick={() => setStep(5)} variant="outline">Voltar ao Preview</Button>
          </CardContent>
        </Card>
      )}

      {/* Save Profile Dialog */}
      <Dialog open={saveProfileDialog} onOpenChange={setSaveProfileDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Guardar Perfil de Importação</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Nome do Perfil</Label>
            <Input
              value={newProfileName}
              onChange={e => setNewProfileName(e.target.value)}
              placeholder="ex: Tabela Mensal Fornecedor X"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveProfileDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveProfile} disabled={!newProfileName.trim()}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
