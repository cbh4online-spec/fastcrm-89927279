import { useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Search, Hash, MapPin, Compass, FolderOpen, UserPlus, Settings, Instagram } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useInstagramLooter } from "@/hooks/useInstagramLooter";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

// Tab Components
import { GlobalSearch } from "@/components/instagram-looter/GlobalSearch";
import { HashtagSearch } from "@/components/instagram-looter/HashtagSearch";
import { LocationSearch } from "@/components/instagram-looter/LocationSearch";
import { ExploreFeed } from "@/components/instagram-looter/ExploreFeed";
import { Collections } from "@/components/instagram-looter/Collections";
import { LeadsTab } from "@/components/instagram-looter/LeadsTab";
import { LooterSettings } from "@/components/instagram-looter/LooterSettings";

const tabs = [
  { id: "search", label: "Busca", icon: Search },
  { id: "hashtag", label: "Hashtags", icon: Hash },
  { id: "location", label: "Local", icon: MapPin },
  { id: "explore", label: "Explore", icon: Compass },
  { id: "collections", label: "Coleções", icon: FolderOpen },
  { id: "leads", label: "Leads", icon: UserPlus },
  { id: "settings", label: "Config", icon: Settings },
];

export default function InstagramLooterPage() {
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const { tab } = useParams<{ tab?: string }>();
  const { isMetodopare, todayUsage } = useInstagramLooter();

  useEffect(() => {
    if (currentWorkspace && !isMetodopare) {
      navigate("/dashboard");
    }
  }, [currentWorkspace, isMetodopare, navigate]);

  if (!isMetodopare) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground mb-2">Acesso Restrito</h2>
            <p className="text-muted-foreground">
              O Instagram Looter está disponível apenas para o workspace metodopare.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const currentTab = tab || "search";
  const handleTabChange = (value: string) => {
    navigate(`/dashboard/instagram-looter/${value}`);
  };

  const dailyLimit = 200;
  const usedToday = todayUsage?.actions_count || 0;
  const remainingActions = dailyLimit - usedToday;
  const usagePercent = Math.min(100, (usedToday / dailyLimit) * 100);

  const renderTabContent = () => {
    switch (currentTab) {
      case "search": return <GlobalSearch />;
      case "hashtag": return <HashtagSearch />;
      case "location": return <LocationSearch />;
      case "explore": return <ExploreFeed />;
      case "collections": return <Collections />;
      case "leads": return <LeadsTab />;
      case "settings": return <LooterSettings />;
      default: return <GlobalSearch />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header with Instagram gradient accent */}
        <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card p-6">
          {/* Gradient accent bar */}
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[hsl(330,80%,60%)] via-[hsl(280,70%,55%)] to-[hsl(30,90%,55%)]" />

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(330,80%,60%)] via-[hsl(280,70%,55%)] to-[hsl(30,90%,55%)] text-white shadow-lg shadow-[hsl(280,70%,55%)]/25">
                <Instagram className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                  Instagram Looter
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-medium">Beta</Badge>
                </h1>
                <p className="text-sm text-muted-foreground">
                  Pesquise e analise perfis públicos para prospeção
                </p>
              </div>
            </div>

            {/* Quota indicator */}
            <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/30 px-4 py-2.5 min-w-[200px]">
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium">Ações hoje</span>
                  <span className="font-semibold text-foreground">{usedToday}/{dailyLimit}</span>
                </div>
                <Progress
                  value={usagePercent}
                  className="h-1.5"
                />
                <p className={cn(
                  "text-[10px] font-medium",
                  remainingActions < 20 ? "text-destructive" : "text-muted-foreground"
                )}>
                  {remainingActions} restantes
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs — pill style */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/50 backdrop-blur-sm border border-border/50 w-fit overflow-x-auto max-w-full flex-nowrap scrollbar-none">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = currentTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => handleTabChange(t.id)}
                className={cn(
                  "flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap shrink-0",
                  active
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="min-h-[60vh]">
          {renderTabContent()}
        </div>
      </div>
    </DashboardLayout>
  );
}
