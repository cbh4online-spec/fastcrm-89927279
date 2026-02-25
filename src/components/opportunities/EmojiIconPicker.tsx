import { useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const VIEW_DOT_COLORS = [
  "bg-blue-500", "bg-green-500", "bg-purple-500", "bg-amber-500",
  "bg-pink-500", "bg-cyan-500", "bg-indigo-500", "bg-rose-500",
  "bg-emerald-500", "bg-orange-500",
];

function hashColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return VIEW_DOT_COLORS[Math.abs(hash) % VIEW_DOT_COLORS.length];
}

const EMOJI_CATEGORIES = [
  { label: "Objects", emojis: ["📋", "📊", "📈", "💼", "🎯", "⭐", "💡", "🔔", "📌", "🏷️", "📁", "📂", "💰", "🏆", "🎨"] },
  { label: "People", emojis: ["👥", "👤", "🤝", "💪", "🙌", "👋", "✋", "🫂"] },
  { label: "Status", emojis: ["✅", "❌", "⚡", "🔥", "❄️", "🚀", "⏰", "🔒", "🔓"] },
  { label: "Shapes", emojis: ["🔴", "🟢", "🔵", "🟡", "🟣", "⬛", "🔶", "🔷"] },
];

interface EmojiIconPickerProps {
  currentIcon: string | null;
  viewName: string;
  onSelect: (icon: string | null) => void;
}

export function EmojiIconPicker({ currentIcon, viewName, onSelect }: EmojiIconPickerProps) {
  const { t } = useTranslation("crm");
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent/50 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          {currentIcon ? (
            <span className="text-base">{currentIcon}</span>
          ) : (
            <div className={cn("w-3 h-3 rounded-full", hashColor(viewName))} />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-64 p-2"
        align="start"
        side="bottom"
        onClick={(e) => e.stopPropagation()}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="space-y-2">
          {EMOJI_CATEGORIES.map((cat) => (
            <div key={cat.label}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-1">
                {cat.label}
              </p>
              <div className="flex flex-wrap gap-0.5">
                {cat.emojis.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className={cn(
                      "h-7 w-7 flex items-center justify-center rounded hover:bg-accent transition-colors text-base",
                      currentIcon === emoji && "bg-accent ring-1 ring-primary"
                    )}
                    onClick={() => {
                      onSelect(emoji);
                      setOpen(false);
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="border-t border-border pt-1.5">
            <button
              type="button"
              className="w-full flex items-center gap-1.5 px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
              onClick={() => {
                onSelect(null);
                setOpen(false);
              }}
            >
              <X className="h-3 w-3" />
              {t("removeIcon", "Remove icon")}
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
