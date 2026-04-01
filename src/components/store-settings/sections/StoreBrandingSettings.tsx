import { useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Upload, X, Image as ImageIcon } from "lucide-react";
import { SectionAIAssistButton } from "@/components/proposals/SectionAIAssistButton";

interface StoreBrandingSettingsProps {
  form: {
    store_name: string;
    logo_url: string;
    banner_url: string;
    primary_color: string;
    accent_color: string;
  };
  setForm: React.Dispatch<React.SetStateAction<any>>;
  handleFileUpload: (file: File, type: "logo" | "banner") => Promise<void>;
  handleGenerateBanner: () => Promise<void>;
  handleSuggestColors: () => Promise<void>;
  isUploadingLogo: boolean;
  isUploadingBanner: boolean;
  isGeneratingBanner: boolean;
  isSuggestingColors: boolean;
}

export function StoreBrandingSettings({
  form, setForm,
  handleFileUpload, handleGenerateBanner, handleSuggestColors,
  isUploadingLogo, isUploadingBanner, isGeneratingBanner, isSuggestingColors,
}: StoreBrandingSettingsProps) {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Branding</CardTitle>
        <CardDescription>Logo, cores e banner da loja</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Logo Upload */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Logotipo</Label>
          <div className="flex items-start gap-4">
            <div className="w-24 h-24 rounded-lg border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/50 flex-shrink-0">
              {form.logo_url ? (
                <img src={form.logo_url} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div className="space-y-2">
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file, "logo");
                  e.target.value = "";
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => logoInputRef.current?.click()}
                disabled={isUploadingLogo}
                className="gap-1.5"
              >
                {isUploadingLogo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                Escolher ficheiro
              </Button>
              {form.logo_url && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setForm((p: any) => ({ ...p, logo_url: "" }))}
                  className="gap-1.5 text-destructive hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                  Remover
                </Button>
              )}
              <p className="text-xs text-muted-foreground">PNG, JPG, SVG ou WebP. Máx: 2MB</p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Banner Upload + AI */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Banner</Label>
          <div className="w-full aspect-[16/5] rounded-lg border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/50">
            {form.banner_url ? (
              <img src={form.banner_url} alt="Banner" className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-1 text-muted-foreground">
                <ImageIcon className="h-10 w-10" />
                <span className="text-sm">Nenhum banner definido</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file, "banner");
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => bannerInputRef.current?.click()}
              disabled={isUploadingBanner}
              className="gap-1.5"
            >
              {isUploadingBanner ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              Escolher ficheiro
            </Button>
            <SectionAIAssistButton
              onClick={handleGenerateBanner}
              isLoading={isGeneratingBanner}
              disabled={!form.store_name.trim()}
              label="Gerar com IA"
              tooltip="Gerar banner fotorealista com IA baseado no nome da loja"
            />
            {form.banner_url && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setForm((p: any) => ({ ...p, banner_url: "" }))}
                className="gap-1.5 text-destructive hover:text-destructive"
              >
                <X className="h-3.5 w-3.5" />
                Remover
              </Button>
            )}
          </div>
        </div>

        <Separator />

        {/* Colors + AI */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Cores</Label>
            <SectionAIAssistButton
              onClick={handleSuggestColors}
              isLoading={isSuggestingColors}
              disabled={!form.store_name.trim()}
              label="Sugerir cores com IA"
              tooltip="Sugerir paleta de cores com IA baseada no nome e descrição da loja"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cor Primária</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={form.primary_color}
                  onChange={(e) => setForm((p: any) => ({ ...p, primary_color: e.target.value }))}
                  className="h-10 w-12 rounded border cursor-pointer"
                />
                <Input
                  value={form.primary_color}
                  onChange={(e) => setForm((p: any) => ({ ...p, primary_color: e.target.value }))}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Cor de Destaque</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={form.accent_color}
                  onChange={(e) => setForm((p: any) => ({ ...p, accent_color: e.target.value }))}
                  className="h-10 w-12 rounded border cursor-pointer"
                />
                <Input
                  value={form.accent_color}
                  onChange={(e) => setForm((p: any) => ({ ...p, accent_color: e.target.value }))}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
