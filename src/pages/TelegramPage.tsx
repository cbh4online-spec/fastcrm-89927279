import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { TelegramSettingsView } from "@/components/groups/TelegramSettingsView";

export default function TelegramPage() {
  return (
    <DashboardLayout>
      <TelegramSettingsView />
    </DashboardLayout>
  );
}
