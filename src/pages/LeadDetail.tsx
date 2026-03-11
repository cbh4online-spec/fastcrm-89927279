import React from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { LeadDetailWithSidebar } from "@/components/crm/LeadDetailWithSidebar";

class LeadDetailErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[LeadDetail] ErrorBoundary caught:", error.message, error.stack, info.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6">
          <p className="font-semibold text-destructive">Erro ao carregar detalhe do Lead</p>
          <pre className="mt-2 text-xs whitespace-pre-wrap text-muted-foreground">{this.state.error?.message}</pre>
          <pre className="mt-1 text-xs whitespace-pre-wrap text-muted-foreground/60">{this.state.error?.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function LeadDetailPage() {
  console.log("[LeadDetail] Page rendering");
  return (
    <DashboardLayout>
      <LeadDetailErrorBoundary>
        <LeadDetailWithSidebar />
      </LeadDetailErrorBoundary>
    </DashboardLayout>
  );
}
