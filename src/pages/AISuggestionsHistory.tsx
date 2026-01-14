import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AISuggestionsDashboard } from "@/components/ai/AISuggestionsDashboard";
import { FeatureGate } from "@/components/subscription/FeatureGate";

export default function AISuggestionsHistory() {
  return (
    <DashboardLayout>
      <FeatureGate feature="ai_suggestions">
        <AISuggestionsDashboard />
      </FeatureGate>
    </DashboardLayout>
  );
}
