import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useOperationalDashboard, useDashboardAIInsights } from "@/hooks/useOperationalDashboard";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { PipelineKanban } from "@/components/dashboard/PipelineKanban";
import { RevenueWidget } from "@/components/dashboard/RevenueWidget";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { SalesProgressionChart } from "@/components/dashboard/SalesProgressionChart";
import { LeadManagementTable } from "@/components/dashboard/LeadManagementTable";
import { SalesGoalsWidget } from "@/components/dashboard/SalesGoalsWidget";
import { SalesPipelineWidget } from "@/components/dashboard/SalesPipelineWidget";
import { InactivityAlertsBanner } from "@/components/productivity/InactivityAlertsBanner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TeamAvatarsWidget } from "@/components/dashboard/TeamAvatarsWidget";

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
          {/* Inactivity Alerts */}
          <InactivityAlertsBanner className="mx-0" />

          {/* Header with Team Avatars */}
          <div className="flex items-center justify-between">
            <DashboardHeader
              greeting={greeting}
              dayStatus={dayStatus}
              isLoading={isLoading || aiLoading}
            />
            <TeamAvatarsWidget />
          </div>

          {/* Main Grid Layout */}
          <div className="grid grid-cols-12 gap-6">
            {/* Pipeline Kanban - Main Area */}
            <div className="col-span-12 lg:col-span-8">
              <PipelineKanban />
            </div>

            {/* Right Sidebar - Goals & Revenue */}
            <div className="col-span-12 lg:col-span-4 space-y-6">
              <SalesGoalsWidget isLoading={isLoading} />
              <RevenueWidget isLoading={isLoading} />
            </div>

            {/* Middle Row - Pipeline & Activity */}
            <div className="col-span-12 lg:col-span-8">
              <SalesPipelineWidget isLoading={isLoading} />
            </div>
            <div className="col-span-12 lg:col-span-4">
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
