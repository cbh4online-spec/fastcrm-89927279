import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AIAssistantsModule } from "@/components/ai-assistants/AIAssistantsModule";

export default function AIAssistants() {
  return (
    <DashboardLayout>
      <div className="p-4 md:p-6">
        <AIAssistantsModule />
      </div>
    </DashboardLayout>
  );
}
