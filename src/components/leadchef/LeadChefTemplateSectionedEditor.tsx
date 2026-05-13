import { useEffect, useMemo, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";

/**
 * Editor de templates LeadChef em secções colapsáveis.
 * Parser: reconhece linhas de cabeçalho do tipo "🍓 *Frutas*" (emoji opcional + texto entre `*`).
 * Tudo o que vier antes do primeiro cabeçalho fica como "preâmbulo".
 */

interface Section {
  heading: string; // ex.: "🍓 *Frutas*"
  content: string; // resto do bloco (sem heading)
}

const HEADER_RE = /^\s*[^\w*\n]{0,6}\*[^*\n]+\*\s*$/;

export function parseTemplateSections(body: string): {
  preamble: string;
  sections: Section[];
} {
  if (!body) return { preamble: "", sections: [] };
  const lines = body.split("\n");
  const sections: Section[] = [];
  let preambleLines: string[] = [];
  let current: Section | null = null;

  for (const line of lines) {
    if (HEADER_RE.test(line)) {
      if (current) sections.push(current);
      current = { heading: line.trim(), content: "" };
    } else if (current) {
      current.content += (current.content ? "\n" : "") + line;
    } else {
      preambleLines.push(line);
    }
  }
  if (current) sections.push(current);

  // trim trailing empty lines per section
  for (const s of sections) s.content = s.content.replace(/\s+$/g, "");
  const preamble = preambleLines.join("\n").replace(/\s+$/g, "");
  return { preamble, sections };
}

export function serializeTemplateSections(
  preamble: string,
  sections: Section[],
): string {
  const parts: string[] = [];
  if (preamble.trim()) parts.push(preamble.trim());
  for (const s of sections) {
    const block = s.content.trim()
      ? `${s.heading}\n${s.content.trim()}`
      : s.heading;
    parts.push(block);
  }
  return parts.join("\n\n");
}

interface Props {
  value: string;
  onChange: (next: string) => void;
}

export function LeadChefTemplateSectionedEditor({ value, onChange }: Props) {
  const parsed = useMemo(() => parseTemplateSections(value), [value]);
  const [preamble, setPreamble] = useState(parsed.preamble);
  const [sections, setSections] = useState<Section[]>(parsed.sections);

  // Re-sync if value changes from outside (ex.: troca de template)
  useEffect(() => {
    const p = parseTemplateSections(value);
    setPreamble(p.preamble);
    setSections(p.sections);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const commit = (nextPreamble: string, nextSections: Section[]) => {
    setPreamble(nextPreamble);
    setSections(nextSections);
    onChange(serializeTemplateSections(nextPreamble, nextSections));
  };

  const updateSection = (idx: number, patch: Partial<Section>) => {
    const next = sections.map((s, i) => (i === idx ? { ...s, ...patch } : s));
    commit(preamble, next);
  };

  const removeSection = (idx: number) => {
    const next = sections.filter((_, i) => i !== idx);
    commit(preamble, next);
  };

  const addSection = () => {
    const next = [
      ...sections,
      { heading: "✨ *Nova secção*", content: "" },
    ];
    commit(preamble, next);
  };

  if (sections.length === 0 && !preamble.trim()) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-slate-500">
          Sem secções detetadas. Adiciona uma para começares a estruturar o template.
        </p>
        <Button type="button" variant="outline" size="sm" onClick={addSection}>
          <Plus className="h-4 w-4 mr-1" /> Adicionar secção
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs text-slate-500">Introdução (sem secção)</Label>
        <Textarea
          value={preamble}
          onChange={(e) => commit(e.target.value, sections)}
          rows={2}
          placeholder="Texto inicial opcional…"
          className="text-sm"
        />
      </div>

      <Accordion type="multiple" className="border rounded-lg divide-y">
        {sections.map((s, idx) => (
          <AccordionItem key={idx} value={`s-${idx}`} className="border-0">
            <AccordionTrigger className="px-3 py-2 hover:no-underline">
              <span className="text-sm font-medium text-left flex-1 truncate">
                {s.heading || "(sem título)"}
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-3 space-y-2">
              <div>
                <Label className="text-xs text-slate-500">Cabeçalho</Label>
                <Input
                  value={s.heading}
                  onChange={(e) => updateSection(idx, { heading: e.target.value })}
                  placeholder="🍓 *Frutas*"
                  className="text-sm"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Mantém o título entre asteriscos para ficar a negrito no WhatsApp.
                </p>
              </div>
              <div>
                <Label className="text-xs text-slate-500">Conteúdo</Label>
                <Textarea
                  value={s.content}
                  onChange={(e) => updateSection(idx, { content: e.target.value })}
                  rows={4}
                  placeholder="☐ Item — quantidade"
                  className="text-sm font-mono"
                />
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => removeSection(idx)}
                >
                  <Trash2 className="h-4 w-4 mr-1" /> Remover secção
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <Button type="button" variant="outline" size="sm" onClick={addSection}>
        <Plus className="h-4 w-4 mr-1" /> Adicionar secção
      </Button>
    </div>
  );
}
