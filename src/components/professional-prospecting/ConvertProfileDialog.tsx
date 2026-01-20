import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Instagram,
  MapPin,
  Briefcase,
  Star,
  Check,
  Loader2,
  FileText,
  Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Profile {
  id: string;
  profile_url: string;
  profile_name: string | null;
  profile_bio: string | null;
  profile_image_url: string | null;
  platform: string;
  inferred_type: string | null;
  inferred_profession: string | null;
  inferred_specialty: string | null;
  inferred_location: string | null;
  inferred_workplace: string | null;
  confidence_score: number | null;
  lead_score: number | null;
  // Instagram enrichment fields
  instagram_followers_count: number | null;
  instagram_following_count: number | null;
  instagram_posts_count: number | null;
  instagram_full_bio: string | null;
  instagram_external_url: string | null;
  instagram_category: string | null;
  instagram_is_verified: boolean | null;
  instagram_is_business: boolean | null;
  instagram_enriched_at: string | null;
}

interface ConvertProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile;
  onConfirm: (options: ConversionOptions) => void;
  isConverting: boolean;
}

export interface ConversionOptions {
  includeInstagramData: boolean;
  includeAnalysisData: boolean;
  additionalNotes: string;
  tags: string[];
}

export function ConvertProfileDialog({
  open,
  onOpenChange,
  profile,
  onConfirm,
  isConverting,
}: ConvertProfileDialogProps) {
  const [includeInstagramData, setIncludeInstagramData] = useState(true);
  const [includeAnalysisData, setIncludeAnalysisData] = useState(true);
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const suggestedTags = [
    profile.inferred_profession,
    profile.inferred_specialty,
    profile.instagram_category,
    profile.platform,
  ].filter(Boolean) as string[];

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleConfirm = () => {
    onConfirm({
      includeInstagramData,
      includeAnalysisData,
      additionalNotes,
      tags: selectedTags,
    });
  };

  const hasInstagramData = !!profile.instagram_enriched_at;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Converter para Lead
          </DialogTitle>
          <DialogDescription>
            Reveja os dados antes de criar o lead no CRM
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 pr-2">
            {/* Profile Summary */}
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              {profile.profile_image_url && (
                <img
                  src={profile.profile_image_url}
                  alt={profile.profile_name || ""}
                  className="w-12 h-12 rounded-full object-cover"
                />
              )}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium truncate">{profile.profile_name || "Sem nome"}</h4>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="outline" className="text-xs">
                    {profile.platform}
                  </Badge>
                  {profile.lead_score && (
                    <span className={cn(
                      "flex items-center gap-1 font-medium",
                      profile.lead_score >= 70 ? "text-green-600" : 
                      profile.lead_score >= 50 ? "text-yellow-600" : "text-orange-600"
                    )}>
                      <Star className="w-3 h-3" />
                      {profile.lead_score}/100
                    </span>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Instagram Data Preview */}
            {hasInstagramData && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Instagram className="w-4 h-4 text-pink-500" />
                    Dados Instagram
                  </Label>
                  <Checkbox
                    checked={includeInstagramData}
                    onCheckedChange={(checked) => setIncludeInstagramData(!!checked)}
                  />
                </div>

                {includeInstagramData && (
                  <div className="pl-6 space-y-2 text-sm">
                    <div className="grid grid-cols-3 gap-2 p-2 bg-gradient-to-r from-pink-500/10 to-purple-500/10 rounded">
                      <div className="text-center">
                        <div className="font-bold">{profile.instagram_posts_count?.toLocaleString() || 0}</div>
                        <div className="text-xs text-muted-foreground">Posts</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold">{profile.instagram_followers_count?.toLocaleString() || 0}</div>
                        <div className="text-xs text-muted-foreground">Seguidores</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold">{profile.instagram_following_count?.toLocaleString() || 0}</div>
                        <div className="text-xs text-muted-foreground">A seguir</div>
                      </div>
                    </div>
                    {profile.instagram_full_bio && (
                      <p className="text-muted-foreground line-clamp-3">
                        "{profile.instagram_full_bio}"
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Analysis Data Preview */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  Dados da Análise IA
                </Label>
                <Checkbox
                  checked={includeAnalysisData}
                  onCheckedChange={(checked) => setIncludeAnalysisData(!!checked)}
                />
              </div>

              {includeAnalysisData && (
                <div className="pl-6 space-y-2 text-sm">
                  {profile.inferred_profession && (
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-3 h-3 text-muted-foreground" />
                      <span>Profissão: <strong>{profile.inferred_profession}</strong></span>
                    </div>
                  )}
                  {profile.inferred_specialty && (
                    <div className="flex items-center gap-2">
                      <Star className="w-3 h-3 text-muted-foreground" />
                      <span>Especialidade: <strong>{profile.inferred_specialty}</strong></span>
                    </div>
                  )}
                  {profile.inferred_location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3 h-3 text-muted-foreground" />
                      <span>Local: <strong>{profile.inferred_location}</strong></span>
                    </div>
                  )}
                  {profile.inferred_workplace && (
                    <div className="flex items-center gap-2">
                      <User className="w-3 h-3 text-muted-foreground" />
                      <span>Local de trabalho: <strong>{profile.inferred_workplace}</strong></span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* Tags Selection */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Tags sugeridas
              </Label>
              <div className="flex flex-wrap gap-2">
                {suggestedTags.map((tag, idx) => (
                  <Badge
                    key={idx}
                    variant={selectedTags.includes(tag) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleTag(tag)}
                  >
                    {selectedTags.includes(tag) && <Check className="w-3 h-3 mr-1" />}
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Additional Notes */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Notas adicionais (opcional)
              </Label>
              <Textarea
                placeholder="Adicione notas ou requisitos do cliente..."
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isConverting}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={isConverting}>
            {isConverting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                A criar...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Criar Lead
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
