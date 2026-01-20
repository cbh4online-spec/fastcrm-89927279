import { useEffect } from "react";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Hash, MapPin, Compass, FolderOpen, UserPlus, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useInstagramLooter } from "@/hooks/useInstagramLooter";

export default function InstagramLooterPage() {
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const location = useLocation();
  const { isMetodopare, todayUsage } = useInstagramLooter();

  // Redirect if not metodopare workspace
  useEffect(() => {
    if (currentWorkspace && !isMetodopare) {
      navigate("/dashboard");
    }
  }, [currentWorkspace, isMetodopare, navigate]);

  if (!isMetodopare) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">Acesso Restrito</h2>
          <p className="text-muted-foreground">
            O Instagram Looter está disponível apenas para o workspace metodopare.
          </p>
        </div>
      </div>
    );
  }

  const currentPath = location.pathname;
  const getCurrentTab = () => {
    if (currentPath.includes("/search")) return "search";
    if (currentPath.includes("/hashtag")) return "hashtag";
    if (currentPath.includes("/location")) return "location";
    if (currentPath.includes("/explore")) return "explore";
    if (currentPath.includes("/collections")) return "collections";
    if (currentPath.includes("/leads")) return "leads";
    if (currentPath.includes("/settings")) return "settings";
    return "search";
  };

  const handleTabChange = (value: string) => {
    navigate(`/dashboard/instagram-looter/${value}`);
  };

  const dailyLimit = 200;
  const usedToday = todayUsage?.actions_count || 0;
  const remainingActions = dailyLimit - usedToday;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            Instagram Looter
            <Badge variant="secondary" className="text-xs">Beta Interno</Badge>
          </h1>
          <p className="text-muted-foreground mt-1">
            Pesquise e analise perfis públicos do Instagram para prospeção
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Ações restantes hoje</p>
          <p className={`text-2xl font-bold ${remainingActions < 20 ? 'text-destructive' : 'text-primary'}`}>
            {remainingActions} / {dailyLimit}
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <Tabs value={getCurrentTab()} onValueChange={handleTabChange}>
        <TabsList className="grid grid-cols-7 w-full max-w-4xl">
          <TabsTrigger value="search" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Busca</span>
          </TabsTrigger>
          <TabsTrigger value="hashtag" className="flex items-center gap-2">
            <Hash className="h-4 w-4" />
            <span className="hidden sm:inline">Hashtags</span>
          </TabsTrigger>
          <TabsTrigger value="location" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span className="hidden sm:inline">Local</span>
          </TabsTrigger>
          <TabsTrigger value="explore" className="flex items-center gap-2">
            <Compass className="h-4 w-4" />
            <span className="hidden sm:inline">Explore</span>
          </TabsTrigger>
          <TabsTrigger value="collections" className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Coleções</span>
          </TabsTrigger>
          <TabsTrigger value="leads" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Leads</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Config</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Content */}
      <div className="min-h-[60vh]">
        <Outlet />
      </div>
    </div>
  );
}
