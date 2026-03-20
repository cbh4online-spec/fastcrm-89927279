import React from "react";

const MODIFIERS = ["⌘", "Ctrl", "Alt", "⌥", "Shift", "⇧"];

interface KbdKeyProps {
  children: string;
  size?: "sm" | "md";
}

export function KbdKey({ children, size = "md" }: KbdKeyProps) {
  const h = size === "sm" ? "h-5 min-w-[20px] text-[11px] px-1" : "h-6 min-w-[24px] text-xs px-1.5";
  return (
    <kbd className={`inline-flex items-center justify-center ${h} rounded border border-border bg-muted font-mono font-medium text-foreground shadow-[0_1px_0_0_hsl(var(--border))] select-none whitespace-nowrap`}>
      {children}
    </kbd>
  );
}

interface ShortcutComboProps {
  keys: string[];
  size?: "sm" | "md";
}

export function ShortcutCombo({ keys, size = "md" }: ShortcutComboProps) {
  const isSequential = keys.length === 2 && !MODIFIERS.includes(keys[0]);
  return (
    <span className="inline-flex items-center gap-0.5">
      {keys.map((key, i) => (
        <React.Fragment key={i}>
          <KbdKey size={size}>{key}</KbdKey>
          {i < keys.length - 1 && (
            <span className="text-[10px] text-muted-foreground mx-0.5 select-none">
              {isSequential ? "→" : "+"}
            </span>
          )}
        </React.Fragment>
      ))}
    </span>
  );
}
