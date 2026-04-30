import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  BookOpen,
  Sparkles,
  PlayCircle,
  ShieldCheck,
  Leaf,
  Zap,
  Heart,
  Star,
  Droplet,
  Sun,
  Award,
} from "lucide-react";

const BENEFIT_ICONS = [ShieldCheck, Leaf, Zap, Heart, Star, Droplet, Sun, Award];

interface ProductOverviewTabProps {
  commercialDescription: string | null;
  benefits: string[] | null;
  tags: string[] | null;
  demoVideoUrl: string | null;
  brandLogoUrl: string | null;
  line: string | null;
}

function getYouTubeEmbed(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

export function ProductOverviewTab({
  commercialDescription,
  benefits,
  tags,
  demoVideoUrl,
  brandLogoUrl,
  line,
}: ProductOverviewTabProps) {
  const cleanBenefits = (benefits || []).filter((b) => b && b.trim().length > 0);
  const cleanTags = (tags || []).filter((t) => t && t.trim().length > 0);
  const ytEmbed = demoVideoUrl ? getYouTubeEmbed(demoVideoUrl) : null;

  const hasContent =
    commercialDescription ||
    cleanBenefits.length > 0 ||
    cleanTags.length > 0 ||
    demoVideoUrl ||
    brandLogoUrl;

  if (!hasContent) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        Sem informação geral disponível para este produto.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Brand & Line */}
      {(brandLogoUrl || line) && (
        <div className="flex items-center gap-3">
          {brandLogoUrl && (
            <img
              src={brandLogoUrl}
              alt={line || "Marca"}
              className="h-10 w-auto object-contain"
              loading="lazy"
            />
          )}
          {line && (
            <Badge variant="outline" className="text-xs">
              Linha: {line}
            </Badge>
          )}
        </div>
      )}

      {/* Benefits — cards com ícones */}
      {cleanBenefits.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Benefícios principais
          </h4>
          <ul className="grid gap-3 sm:grid-cols-2">
            {cleanBenefits.map((benefit, i) => {
              const Icon = BENEFIT_ICONS[i % BENEFIT_ICONS.length];
              return (
                <li
                  key={i}
                  className="group flex items-start gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary/40 hover:bg-muted/40"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-4.5 w-4.5" strokeWidth={2} />
                  </div>
                  <span className="text-sm leading-snug pt-1">{benefit}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Commercial Description */}
      {commercialDescription && (
        <>
          {cleanBenefits.length > 0 && <Separator />}
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              Descrição
            </h4>
            <div className="text-sm text-muted-foreground space-y-2 leading-relaxed">
              {commercialDescription
                .split(/\n\s*\n/)
                .map((para, i) => (
                  <p key={i} className="whitespace-pre-wrap">
                    {para.trim()}
                  </p>
                ))}
            </div>
          </div>
        </>
      )}

      {/* Demo Video */}
      {ytEmbed && (
        <>
          <Separator />
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <PlayCircle className="h-4 w-4 text-primary" />
              Vídeo demonstrativo
            </h4>
            <div className="relative w-full overflow-hidden rounded-lg" style={{ paddingBottom: "56.25%" }}>
              <iframe
                src={ytEmbed}
                title="Vídeo demonstrativo"
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </>
      )}
      {!ytEmbed && demoVideoUrl && (
        <>
          <Separator />
          <a
            href={demoVideoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <PlayCircle className="h-4 w-4" />
            Ver vídeo demonstrativo
          </a>
        </>
      )}

      {/* Tags */}
      {cleanTags.length > 0 && (
        <>
          <Separator />
          <div>
            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2 tracking-wide">
              Indicadores
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {cleanTags.map((tag, i) => (
                <Badge key={i} variant="secondary" className="text-xs font-normal">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
