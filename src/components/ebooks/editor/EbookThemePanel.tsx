import { ScrollArea } from "@/components/ui/scroll-area";
import { Palette } from "lucide-react";
import { EbookThemeSelector } from "../EbookThemeSelector";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface EbookThemePanelProps {
  theme: string;
  headingFont: string;
  bodyFont: string;
  onThemeChange: (theme: string) => void;
  onHeadingFontChange: (font: string) => void;
  onBodyFontChange: (font: string) => void;
}

export function EbookThemePanel({
  theme, headingFont, bodyFont,
  onThemeChange, onHeadingFontChange, onBodyFontChange,
}: EbookThemePanelProps) {
  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-4">
        <div>
          <h4 className="text-xs font-semibold text-foreground mb-2">Aparência</h4>
          <EbookThemeSelector value={theme} onChange={onThemeChange} />
        </div>

        <div className="border-t border-border/30 pt-3 space-y-2">
          <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Palette className="h-3.5 w-3.5 text-muted-foreground" /> Tipografia
          </span>
          <div className="space-y-2">
            <div>
              <label className="text-xs text-muted-foreground">Títulos</label>
              <Select value={headingFont} onValueChange={onHeadingFontChange}>
                <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Georgia, serif">Georgia</SelectItem>
                  <SelectItem value="'Merriweather', serif">Merriweather</SelectItem>
                  <SelectItem value="'Lora', serif">Lora</SelectItem>
                  <SelectItem value="'Playfair Display', serif">Playfair Display</SelectItem>
                  <SelectItem value="Inter, sans-serif">Inter</SelectItem>
                  <SelectItem value="'Open Sans', sans-serif">Open Sans</SelectItem>
                  <SelectItem value="system-ui, sans-serif">System UI</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Corpo</label>
              <Select value={bodyFont} onValueChange={onBodyFontChange}>
                <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Georgia, serif">Georgia</SelectItem>
                  <SelectItem value="'Merriweather', serif">Merriweather</SelectItem>
                  <SelectItem value="'Lora', serif">Lora</SelectItem>
                  <SelectItem value="Inter, sans-serif">Inter</SelectItem>
                  <SelectItem value="'Open Sans', sans-serif">Open Sans</SelectItem>
                  <SelectItem value="system-ui, sans-serif">System UI</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
