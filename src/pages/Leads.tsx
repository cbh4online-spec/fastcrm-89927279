import React from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { LeadsListIX } from "@/components/leads/LeadsListIX";

class LeadsErrorBoundary extends React.Component<
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
    console.error("[Leads] ErrorBoundary caught:", error, info.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-destructive">
          <p className="font-semibold">Erro ao carregar módulo de Leads</p>
          <pre className="mt-2 text-xs whitespace-pre-wrap">{this.state.error?.message}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function Leads() {
  return (
    <DashboardLayout>
      <LeadsErrorBoundary>
        <LeadsListIX />
      </LeadsErrorBoundary>
    </DashboardLayout>
  );
}
