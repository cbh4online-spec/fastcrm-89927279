import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ClientUsersList } from "@/components/client-users/ClientUsersList";
import { ClientUserStats } from "@/components/client-users/ClientUserStats";
import { InviteClientDialog } from "@/components/client-users/InviteClientDialog";
import { Users } from "lucide-react";

export default function ClientUsersPage() {
  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6" />
              Clientes B2B
            </h1>
            <p className="text-muted-foreground">
              Gerir clientes profissionais e seus acessos ao portal
            </p>
          </div>
          <InviteClientDialog />
        </div>

        <ClientUserStats />

        <ClientUsersList />
      </div>
    </DashboardLayout>
  );
}
