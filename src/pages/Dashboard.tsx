import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useOperationalDashboard, useDashboardAIInsights } from "@/hooks/useOperationalDashboard";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { PipelineKanban } from "@/components/dashboard/PipelineKanban";
import { RevenueWidget } from "@/components/dashboard/RevenueWidget";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { SalesProgressionChart } from "@/components/dashboard/SalesProgressionChart";
import { LeadManagementTable } from "@/components/dashboard/LeadManagementTable";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

// Demo team avatars
const teamMembers = [
  { name: "Maria Costa", initials: "MC" },
  { name: "Pedro Santos", initials: "PS" },
  { name: "Ana Ferreira", initials: "AF" },
  { name: "Carlos Mendes", initials: "CM" },
];

export default function Dashboard() {
  const {
    kpis,
    userName,
    workspaceName,
    isLoading,
  } = useOperationalDashboard();

  const {
    data: aiInsights,
    isLoading: aiLoading,
  } = useDashboardAIInsights(kpis, userName, workspaceName);

  const greeting = aiInsights?.greeting || `Olá, ${userName}!`;
  const dayStatus = aiInsights?.dayStatus || "Aqui está o resumo do seu dia...";

  return (
    <DashboardLayout>
      <ScrollArea className="h-[calc(100vh-5rem)]">
        <div className="space-y-6 pb-8">
          {/* Header with Team Avatars */}
          <div className="flex items-center justify-between">
            <DashboardHeader
              greeting={greeting}
              dayStatus={dayStatus}
              isLoading={isLoading || aiLoading}
            />
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground mr-2">Equipa:</span>
              <div className="flex -space-x-2">
                {teamMembers.map((member, i) => (
                  <Avatar key={i} className="h-8 w-8 border-2 border-background">
                    <AvatarImage src="" />
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                      {member.initials}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
            </div>
          </div>

          {/* Main Grid Layout */}
          <div className="grid grid-cols-12 gap-6">
            {/* Pipeline Kanban - Main Area */}
            <div className="col-span-12 lg:col-span-8">
              <PipelineKanban />
            </div>

            {/* Right Sidebar - Revenue & Activity */}
            <div className="col-span-12 lg:col-span-4 space-y-6">
              <RevenueWidget isLoading={isLoading} />
              <ActivityFeed maxItems={5} isLoading={isLoading} />
            </div>

            {/* Bottom Row */}
            <div className="col-span-12 lg:col-span-6">
              <SalesProgressionChart isLoading={isLoading} />
            </div>
            <div className="col-span-12 lg:col-span-6">
              <LeadManagementTable maxItems={5} isLoading={isLoading} />
            </div>
          </div>
        </div>
      </ScrollArea>
    </DashboardLayout>
  );
}
