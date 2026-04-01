import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Layers,
  Palette,
  Component,
  ChevronDown,
  LayoutGrid,
  Type,
  MousePointerClick,
  Image,
  FormInput,
} from "lucide-react";
import type { NormalizedPayload } from "@/hooks/useMarketingMCP";

const SECTION_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  hero: { label: "Hero", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  cta: { label: "CTA", color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" },
  faq: { label: "FAQ", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
  pricing: { label: "Pricing", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  social_proof: { label: "Social Proof", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
  footer: { label: "Footer", color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200" },
  navigation: { label: "Navegação", color: "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200" },
  form: { label: "Formulário", color: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200" },
  benefits: { label: "Benefícios", color: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200" },
  thank_you: { label: "Thank You", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200" },
  upsell: { label: "Upsell", color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" },
  webinar: { label: "Webinar", color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200" },
  content: { label: "Conteúdo", color: "bg-muted text-muted-foreground" },
};

interface MCPImportResultProps {
  normalized: NormalizedPayload;
}

export function MCPImportResult({ normalized }: MCPImportResultProps) {
  const { sections, tokens, components, metadata } = normalized;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-lg font-semibold">{metadata.section_count}</p>
              <p className="text-xs text-muted-foreground">Secções</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Component className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-lg font-semibold">{metadata.component_count}</p>
              <p className="text-xs text-muted-foreground">Componentes</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-lg font-semibold">{metadata.color_count}</p>
              <p className="text-xs text-muted-foreground">Cores</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Type className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-lg font-semibold">{metadata.typography_count}</p>
              <p className="text-xs text-muted-foreground">Tipografias</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Sections */}
      {sections.length > 0 && (
        <Collapsible defaultOpen>
          <Card>
            <CollapsibleTrigger className="w-full">
              <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <LayoutGrid className="h-4 w-4" />
                  Secções Detectadas ({sections.length})
                </CardTitle>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 pb-3 px-4">
                <div className="space-y-2">
                  {sections.map((s, i) => {
                    const typeConfig = SECTION_TYPE_CONFIG[s.section_type] || SECTION_TYPE_CONFIG.content;
                    return (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2 border rounded-md"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-6">{s.order + 1}</span>
                          <Badge variant="secondary" className={`text-xs ${typeConfig.color}`}>
                            {typeConfig.label}
                          </Badge>
                          <span className="text-sm font-medium truncate max-w-[200px]">
                            {s.section_name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          {s.content_placeholders.length > 0 && (
                            <span className="flex items-center gap-1 text-xs">
                              <Type className="h-3 w-3" />
                              {s.content_placeholders.length}
                            </span>
                          )}
                          {s.media_slots.length > 0 && (
                            <span className="flex items-center gap-1 text-xs">
                              <Image className="h-3 w-3" />
                              {s.media_slots.length}
                            </span>
                          )}
                          {s.cta_slots.length > 0 && (
                            <span className="flex items-center gap-1 text-xs">
                              <MousePointerClick className="h-3 w-3" />
                              {s.cta_slots.length}
                            </span>
                          )}
                          {s.form_slots.length > 0 && (
                            <span className="flex items-center gap-1 text-xs">
                              <FormInput className="h-3 w-3" />
                              {s.form_slots.length}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Tokens */}
      {(Object.keys(tokens.colors || {}).length > 0 || Object.keys(tokens.typography || {}).length > 0) && (
        <Collapsible>
          <Card>
            <CollapsibleTrigger className="w-full">
              <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Tokens Detectados
                </CardTitle>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 pb-3 px-4">
                {Object.keys(tokens.colors || {}).length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Cores</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(tokens.colors).map(([name, hex]) => (
                        <div key={name} className="flex items-center gap-1.5 text-xs border rounded-md px-2 py-1">
                          <div
                            className="h-3 w-3 rounded-full border"
                            style={{ backgroundColor: hex }}
                          />
                          <span className="truncate max-w-[100px]">{name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {Object.keys(tokens.typography || {}).length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Tipografia</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.keys(tokens.typography).map((name) => (
                        <Badge key={name} variant="outline" className="text-xs">
                          {name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Components */}
      {components.length > 0 && (
        <Collapsible>
          <Card>
            <CollapsibleTrigger className="w-full">
              <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Component className="h-4 w-4" />
                  Componentes ({components.length})
                </CardTitle>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 pb-3 px-4">
                <div className="space-y-1">
                  {components.map((c, i) => (
                    <div key={i} className="flex items-center justify-between text-sm py-1">
                      <span>{c.name}</span>
                      {c.variants.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {c.variants.length} variantes
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}
    </div>
  );
}
