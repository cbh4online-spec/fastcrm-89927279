import { useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AskFastCRMInline } from "@/components/ask-fastcrm/AskFastCRMInline";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Loader2 } from "lucide-react";
import React from "react";

class AskErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error) {
    console.error("[AskPage] Error boundary caught:", error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-muted-foreground gap-3">
          <p className="text-sm">Algo correu mal ao carregar o Ask FastCRM.</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="text-xs text-primary hover:underline"
          >
            Tentar novamente
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function AskPage() {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || undefined;
  const { currentWorkspace, loading } = useWorkspace();

  if (loading || !currentWorkspace) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <AskErrorBoundary>
        <AskFastCRMInline initialQuery={initialQuery} fullPage />
      </AskErrorBoundary>
    </DashboardLayout>
  );
}
