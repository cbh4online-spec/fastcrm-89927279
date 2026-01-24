import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  ClipboardList,
  Calendar,
  FileUp,
  Settings,
  Bot,
  ChevronLeft,
  Sparkles,
} from "lucide-react";

interface SJSidebarProps {
  onOpenAssistant?: () => void;
}

const menuItems = [
  {
    id: "dashboard",
    label: "Painel",
    icon: LayoutDashboard,
    path: "/dashboard/student-journey",
  },
  {
    id: "profiles",
    label: "Perfis",
    icon: Users,
    path: "/dashboard/student-journey/profiles",
  },
  {
    id: "courses",
    label: "Cursos",
    icon: GraduationCap,
    path: "/dashboard/student-journey/courses",
  },
  {
    id: "cohorts",
    label: "Turmas",
    icon: ClipboardList,
    path: "/dashboard/student-journey/cohorts",
  },
];

export function SJSidebar({ onOpenAssistant }: SJSidebarProps) {
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => {
    if (path === "/dashboard/student-journey") {
      return currentPath === path;
    }
    return currentPath.startsWith(path);
  };

  return (
    <div className="w-64 border-r border-border bg-muted/30 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-3">
          <Link
            to="/dashboard"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            CRM
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Student Journey</h2>
            <p className="text-xs text-muted-foreground">Módulo de Formação</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-1">
          {menuItems.map((item) => (
            <Link key={item.id} to={item.path}>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-3 h-10",
                  isActive(item.path) &&
                    "bg-primary/10 text-primary hover:bg-primary/15"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Button>
            </Link>
          ))}
        </div>
      </ScrollArea>

      {/* AI Assistant Button */}
      <div className="p-3 border-t border-border">
        <Button
          onClick={onOpenAssistant}
          className="w-full gap-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700"
        >
          <Sparkles className="h-4 w-4" />
          SJ Copilot
        </Button>
      </div>
    </div>
  );
}
