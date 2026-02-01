/**
 * Widget Tab - Wrapper for WidgetConfigPanel
 * Integrates chat widget configuration into the AI Assistants module
 */

import { WidgetConfigPanel } from "@/components/chat-widget/WidgetConfigPanel";

export function WidgetTab() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Configure o widget de chat que pode ser embebido em qualquer website para fornecer suporte IA.
      </p>
      <WidgetConfigPanel />
    </div>
  );
}
