import { useState } from "react";
import { useWorkspace, Workspace } from "@/contexts/WorkspaceContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Plus, Check, Loader2, Shield, Search } from "lucide-react";
import { toast } from "sonner";
import { WorkspaceLogo } from "@/components/workspace/WorkspaceLogo";

interface WorkspaceSwitcherProps {
  collapsed?: boolean;
}

export function WorkspaceSwitcher({ collapsed }: WorkspaceSwitcherProps) {
  const { 
    currentWorkspace, 
    setCurrentWorkspace, 
    createWorkspace,
    isSuperAdmin,
    ownWorkspaces,
    managedWorkspaces,
  } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");

  const matches = (w: Workspace) =>
    w.name?.toLowerCase().includes(search.trim().toLowerCase());
  const filteredOwn = ownWorkspaces.filter(matches);
  const filteredManaged = managedWorkspaces.filter(matches);

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) return;

    setCreating(true);
    const { error } = await createWorkspace(newWorkspaceName);

    if (error) {
      toast.error("Failed to create workspace");
    } else {
      toast.success("Workspace created!");
      setDialogOpen(false);
      setNewWorkspaceName("");
    }
    setCreating(false);
  };

  const handleSelectWorkspace = (workspace: Workspace) => {
    setCurrentWorkspace(workspace);
    setOpen(false);
  };

  const renderWorkspaceItem = (workspace: Workspace) => (
    <DropdownMenuItem
      key={workspace.id}
      onClick={() => handleSelectWorkspace(workspace)}
      className="flex items-center justify-between"
    >
      <div className="flex items-center gap-3 min-w-0">
        {workspace.isAgencyManaged ? (
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
            <Shield className="w-4 h-4 text-amber-500" />
          </div>
        ) : (
          <WorkspaceLogo
            logoUrl={workspace.logo_url}
            workspaceName={workspace.name}
            size="md"
          />
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{workspace.name}</p>
          <p className="text-xs text-muted-foreground capitalize">
            {workspace.isAgencyManaged ? "Gestão" : workspace.role}
          </p>
        </div>
      </div>
      {currentWorkspace?.id === workspace.id && (
        <Check className="w-4 h-4 text-primary flex-shrink-0" />
      )}
    </DropdownMenuItem>
  );

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          {collapsed ? (
            <Button
              variant="ghost"
              className="w-full justify-center h-auto py-2 px-0 hover:bg-muted"
            >
              {currentWorkspace?.isAgencyManaged ? (
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-4 h-4 text-amber-500" />
                </div>
              ) : (
                <WorkspaceLogo
                  logoUrl={currentWorkspace?.logo_url}
                  workspaceName={currentWorkspace?.name}
                  size="md"
                  variant="sidebar"
                />
              )}
            </Button>
          ) : (
            <Button
              variant="ghost"
              className="w-full justify-between h-auto py-2 px-3 hover:bg-muted"
            >
              <div className="flex items-center gap-3 min-w-0">
                {currentWorkspace?.isAgencyManaged ? (
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-4 h-4 text-amber-500" />
                  </div>
                ) : (
                  <WorkspaceLogo
                    logoUrl={currentWorkspace?.logo_url}
                    workspaceName={currentWorkspace?.name}
                    size="md"
                    variant="sidebar"
                  />
                )}
                <div className="text-left min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground truncate max-w-[150px]">
                      {currentWorkspace?.name || "Select workspace"}
                    </p>
                    {currentWorkspace?.isAgencyManaged && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-amber-500/10 text-amber-600 border-amber-500/30">
                        Gestão
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground capitalize">
                    {currentWorkspace?.isAgencyManaged ? "Modo agência" : currentWorkspace?.role || "No role"}
                  </p>
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-72 max-h-[80vh] p-0 flex flex-col" align="start">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                placeholder="Pesquisar workspace..."
                className="h-8 pl-8 text-sm"
                aria-label="Pesquisar workspace"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[50vh] py-1">
            {/* Workspaces próprios */}
            {filteredOwn.length > 0 && (
              <>
                <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                  {isSuperAdmin ? "Meus Workspaces" : "Workspaces"}
                </DropdownMenuLabel>
                {filteredOwn.map(renderWorkspaceItem)}
              </>
            )}

            {/* Workspaces geridos (apenas super admins) */}
            {isSuperAdmin && filteredManaged.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-muted-foreground font-normal flex items-center gap-1.5">
                  <Shield className="w-3 h-3 text-amber-500" />
                  Clientes (Gestão)
                </DropdownMenuLabel>
                {filteredManaged.map(renderWorkspaceItem)}
              </>
            )}

            {filteredOwn.length === 0 && filteredManaged.length === 0 && (
              <p className="px-3 py-6 text-sm text-muted-foreground text-center">
                Sem resultados para "{search}"
              </p>
            )}
          </div>

          <div className="border-t border-border p-1">
            <DropdownMenuItem onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Criar workspace
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar workspace</DialogTitle>
            <DialogDescription>
              Cria um novo workspace para a tua equipa ou organização.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="workspaceName">Nome do workspace</Label>
              <Input
                id="workspaceName"
                placeholder="Acme Lda."
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newWorkspaceName.trim() && !creating) {
                    handleCreateWorkspace();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateWorkspace} disabled={creating || !newWorkspaceName.trim()}>
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  );
}
