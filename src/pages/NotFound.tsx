import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Home, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center max-w-md px-4">
        <h1 className="mb-4 text-6xl font-bold text-primary">404</h1>
        <p className="mb-2 text-xl font-medium">Página não encontrada</p>
        <p className="mb-6 text-muted-foreground">
          A rota <code className="bg-muted-foreground/10 px-2 py-1 rounded text-sm">{location.pathname}</code> não existe.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild variant="default">
            <Link to="/dashboard" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Ir para Dashboard
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/" className="gap-2">
              <Home className="h-4 w-4" />
              Página Inicial
            </Link>
          </Button>
        </div>
        <Button 
          variant="ghost" 
          className="mt-4 text-muted-foreground"
          onClick={() => window.history.back()}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
