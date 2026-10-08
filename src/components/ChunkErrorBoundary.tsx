import { Component, ReactNode } from "react";
import { isChunkLoadError, recoverFromChunkError } from "@/lib/chunkRecovery";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  reloading: boolean;
}

export class ChunkErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, reloading: false };

  static getDerivedStateFromError(error: Error): State | null {
    if (isChunkLoadError(error)) {
      return { hasError: true, reloading: true };
    }
    // Not a chunk error — don't claim it; let it bubble.
    return null;
  }

  private fallbackTimer: number | undefined;

  componentDidCatch(error: Error) {
    if (!isChunkLoadError(error)) return;

    this.armFallback();
    void recoverFromChunkError().then((started) => {
      if (!started) this.setState({ reloading: false });
    });
  }

  componentWillUnmount() {
    window.clearTimeout(this.fallbackTimer);
  }

  /** Se o recarregamento não acontecer, mostrar sempre o botão manual. */
  private armFallback() {
    window.clearTimeout(this.fallbackTimer);
    this.fallbackTimer = window.setTimeout(() => this.setState({ reloading: false }), 8000);
  }

  handleManualReload = () => {
    this.setState({ reloading: true });
    this.armFallback();
    void recoverFromChunkError(true);
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background px-6">
          <div className="flex flex-col items-center gap-4 text-center max-w-sm">
            <div className="h-10 w-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
            {this.state.reloading ? (
              <>
                <p className="text-sm font-medium text-foreground">
                  A atualizar a aplicação…
                </p>
                <p className="text-xs text-muted-foreground">
                  Estamos a carregar a versão mais recente.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-foreground">
                  Não foi possível carregar este ecrã
                </p>
                <p className="text-xs text-muted-foreground">
                  Verifique a sua ligação e tente novamente.
                </p>
                <Button
                  type="button"
                  onClick={this.handleManualReload}
                  className="mt-2"
                >
                  Tentar novamente
                </Button>
              </>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
