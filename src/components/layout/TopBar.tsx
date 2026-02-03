import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Menu, LogOut, User, Settings, Search, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { GlobalSearch } from "./GlobalSearch";
import { useUserRole } from "@/hooks/useUserRole";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SmartAlertsPopover } from "@/components/inbox/SmartAlertsPopover";
import { HelpSupportDropdown } from "./HelpSupportDropdown";

interface TopBarProps {
  onMenuClick: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { isSuperAdmin } = useUserRole();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const initials = user?.user_metadata?.full_name
    ?.split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase() || user?.email?.[0].toUpperCase() || "U";

  return (
    <header className="sticky top-0 z-30 h-14 bg-background/80 backdrop-blur-xl border-b border-border/50 flex items-center justify-between px-4 lg:px-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="lg:hidden h-9 w-9"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="hidden md:flex">
          <GlobalSearch />
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {/* Mobile search button */}
        <div className="md:hidden">
          <GlobalSearch
            trigger={
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Search className="h-4 w-4" />
              </Button>
            }
          />
        </div>

        {/* Super Admin SaaS Management shortcut */}
        {isSuperAdmin && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate("/super-admin")}
                className="h-9 w-9 text-amber-500 hover:text-amber-600 hover:bg-amber-500/10"
              >
                <ShieldCheck className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Gestão SaaS</p>
            </TooltipContent>
          </Tooltip>
        )}

        <HelpSupportDropdown />
        
        <SmartAlertsPopover className="h-9 w-9 p-0" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full ring-2 ring-transparent hover:ring-primary/20 transition-all">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-violet-600 text-primary-foreground text-xs font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg mx-1 mt-1">
              <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-violet-600 text-primary-foreground text-sm font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col space-y-0.5 min-w-0">
                <p className="text-sm font-semibold truncate">
                  {user?.user_metadata?.full_name || "User"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.email}
                </p>
              </div>
            </div>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem onClick={() => navigate("/dashboard/profile")}>
              <User className="mr-2 h-4 w-4" />
              Perfil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/dashboard/settings")}>
              <Settings className="mr-2 h-4 w-4" />
              Definições
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Terminar sessão
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
