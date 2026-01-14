import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AISuggestionsDashboard } from "@/components/ai/AISuggestionsDashboard";

export default function AISuggestionsHistory() {
  return (
    <DashboardLayout>
      <AISuggestionsDashboard />
    </DashboardLayout>
  );
}
