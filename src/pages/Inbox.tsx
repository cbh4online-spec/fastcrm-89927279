import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { InboxView } from "@/components/inbox/InboxView";

export default function Inbox() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Inbox</h1>
          <p className="text-muted-foreground">Manage all your conversations in one place</p>
        </div>
        <InboxView />
      </div>
    </DashboardLayout>
  );
}
