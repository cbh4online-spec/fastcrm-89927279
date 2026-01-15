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
import { ChevronDown, Plus, Check, Building2, Loader2, Shield } from "lucide-react";
import { toast } from "sonner";

export function WorkspaceSwitcher() {
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
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
          workspace.isAgencyManaged 
            ? "bg-amber-500/10" 
            : "bg-primary/10"
        }`}>
          {workspace.isAgencyManaged ? (
            <Shield className="w-4 h-4 text-amber-500" />
          ) : (
            <Building2 className="w-4 h-4 text-primary" />
          )}
        </div>
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
          <Button
            variant="ghost"
            className="w-full justify-between h-auto py-2 px-3 bg-sidebar-accent hover:bg-sidebar-accent/80"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                currentWorkspace?.isAgencyManaged 
                  ? "bg-amber-500/20" 
                  : "bg-sidebar-primary/20"
              }`}>
                {currentWorkspace?.isAgencyManaged ? (
                  <Shield className="w-4 h-4 text-amber-500" />
                ) : (
                  <Building2 className="w-4 h-4 text-sidebar-primary" />
                )}
              </div>
              <div className="text-left min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">
                    {currentWorkspace?.name || "Select workspace"}
                  </p>
                  {currentWorkspace?.isAgencyManaged && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-amber-500/10 text-amber-600 border-amber-500/30">
                      Gestão
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-sidebar-foreground/60 capitalize">
                  {currentWorkspace?.isAgencyManaged ? "Modo agência" : currentWorkspace?.role || "No role"}
                </p>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-sidebar-foreground/60 flex-shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-72" align="start">
          {/* Own Workspaces */}
          {ownWorkspaces.length > 0 && (
            <>
              <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                {isSuperAdmin ? "Meus Workspaces" : "Workspaces"}
              </DropdownMenuLabel>
              {ownWorkspaces.map(renderWorkspaceItem)}
            </>
          )}

          {/* Agency Managed Workspaces (only for super admins) */}
          {isSuperAdmin && managedWorkspaces.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground font-normal flex items-center gap-1.5">
                <Shield className="w-3 h-3 text-amber-500" />
                Clientes (Gestão)
              </DropdownMenuLabel>
              {managedWorkspaces.map(renderWorkspaceItem)}
            </>
          )}

          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create workspace
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create workspace</DialogTitle>
            <DialogDescription>
              Create a new workspace for your team or organization.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="workspaceName">Workspace name</Label>
              <Input
                id="workspaceName"
                placeholder="Acme Inc."
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateWorkspace} disabled={creating || !newWorkspaceName.trim()}>
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
