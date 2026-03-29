import type { EbookTemplate } from "@/types/ebook-templates";
import { CATEGORY_LABELS } from "@/types/ebook-templates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Copy, Check } from "lucide-react";

interface Props {
  template: EbookTemplate;
  onPreview: (t: EbookTemplate) => void;
  onUse: (t: EbookTemplate) => void;
  onDuplicate?: (t: EbookTemplate) => void;
}

export function TemplateCard({ template, onPreview, onUse, onDuplicate }: Props) {
  const t = template.style_tokens;

  return (
    <div className="group border border-border/50 rounded-xl overflow-hidden bg-card hover:shadow-lg transition-all duration-300 hover:border-primary/30">
      {/* Color preview thumbnail */}
      <div
        className="relative h-48 overflow-hidden cursor-pointer"
        onClick={() => onPreview(template)}
        style={{ backgroundColor: t.backgroundColor }}
      >
        {/* Mini layout preview */}
        <div className="absolute inset-4 flex flex-col gap-2">
          <div className="flex-1 rounded-md flex flex-col justify-end p-4" style={{ backgroundColor: t.primaryColor }}>
            <div className="h-3 w-3/4 rounded-sm mb-1" style={{ backgroundColor: t.backgroundColor, opacity: 0.9 }} />
            <div className="h-2 w-1/2 rounded-sm" style={{ backgroundColor: t.accentColor, opacity: 0.8 }} />
          </div>
          <div className="flex gap-2">
            <div className="flex-1 h-12 rounded-md" style={{ backgroundColor: `${t.accentColor}22` }} />
            <div className="flex-1 h-12 rounded-md" style={{ backgroundColor: `${t.accentColor}22` }} />
            <div className="flex-1 h-12 rounded-md" style={{ backgroundColor: `${t.accentColor}22` }} />
          </div>
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
          <Button variant="secondary" size="sm" className="gap-2">
            <Eye className="h-4 w-4" /> Preview
          </Button>
        </div>
      </div>

      {/* Info */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{template.name}</h3>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{template.description}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs">
            {CATEGORY_LABELS[template.category] || template.category}
          </Badge>
          <span className="text-xs text-muted-foreground">{template.page_layouts.length} páginas</span>
          {template.is_system_template && (
            <Badge variant="secondary" className="text-xs">Sistema</Badge>
          )}
        </div>

        {/* Color swatches */}
        <div className="flex gap-1">
          {[t.primaryColor, t.secondaryColor, t.accentColor, t.backgroundColor].map((c, i) => (
            <div key={i} className="w-5 h-5 rounded-full border border-border/40" style={{ backgroundColor: c }} />
          ))}
          <span className="text-xs text-muted-foreground ml-auto self-center">{t.headingFont}</span>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button size="sm" className="flex-1 gap-1 text-xs" onClick={() => onUse(template)}>
            <Check className="h-3 w-3" /> Usar
          </Button>
          {onDuplicate && (
            <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => onDuplicate(template)}>
              <Copy className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
