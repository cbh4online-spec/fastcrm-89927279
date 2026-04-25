import { Component, ReactNode } from "react";

const RELOAD_KEY = "__chunk_boundary_reloaded_at";

const isStaleChunkError = (err: unknown): boolean => {
  const message =
    (typeof err === "string" ? err : (err as Error)?.message) || "";
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError/i.test(
    message,
  );
};

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ChunkErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    if (isStaleChunkError(error)) {
      try {
        const last = Number(sessionStorage.getItem(RELOAD_KEY) || "0");
        if (Date.now() - last > 10_000) {
          sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
          window.location.reload();
        }
      } catch {
        window.location.reload();
      }
      return { hasError: true };
    }
    // Re-throw non-chunk errors by not handling them here
    throw error;
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}
