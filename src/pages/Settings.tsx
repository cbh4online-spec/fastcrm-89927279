import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Building2, Users, Shield, Bell, Plug, Trash2 } from "lucide-react";
import { InstagramConnectionCard } from "@/components/integrations/InstagramConnectionCard";

const teamMembers = [
  { id: 1, name: "John Doe", email: "john@example.com", role: "owner", avatar: null },
  { id: 2, name: "Sarah Johnson", email: "sarah@example.com", role: "admin", avatar: null },
  { id: 3, name: "Mike Chen", email: "mike@example.com", role: "agent", avatar: null },
  { id: 4, name: "Emily Davis", email: "emily@example.com", role: "viewer", avatar: null },
];

const roleColors: Record<string, string> = {
  owner: "bg-primary text-primary-foreground",
  admin: "bg-info text-info-foreground",
  agent: "bg-success text-success-foreground",
  viewer: "bg-muted text-muted-foreground",
};

export default function Settings() {
  const { currentWorkspace } = useWorkspace();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">
            Manage your workspace settings and preferences
          </p>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList>
            <TabsTrigger value="general" className="gap-2">
              <Building2 className="h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="team" className="gap-2">
              <Users className="h-4 w-4" />
              Team
            </TabsTrigger>
            <TabsTrigger value="integrations" className="gap-2">
              <Plug className="h-4 w-4" />
              Integrações
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Workspace Information</CardTitle>
                <CardDescription>Update your workspace details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="workspaceName">Workspace name</Label>
                  <Input
                    id="workspaceName"
                    defaultValue={currentWorkspace?.name}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workspaceSlug">Workspace URL</Label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-sm text-muted-foreground">
                      app.workspaceos.com/
                    </span>
                    <Input
                      id="workspaceSlug"
                      defaultValue={currentWorkspace?.slug}
                      className="rounded-l-none"
                    />
                  </div>
                </div>
                <Button>Save changes</Button>
              </CardContent>
            </Card>

            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
                <CardDescription>
                  Irreversible and destructive actions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete workspace
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Team Members</CardTitle>
                  <CardDescription>
                    Manage your workspace team and their roles
                  </CardDescription>
                </div>
                <Button>
                  <Users className="mr-2 h-4 w-4" />
                  Invite member
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {teamMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between py-3 border-b border-border last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={member.avatar || undefined} />
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {member.name.split(" ").map((n) => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{member.name}</p>
                          <p className="text-sm text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                      <Badge className={roleColors[member.role]}>
                        {member.role}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Role Permissions</CardTitle>
                <CardDescription>
                  Understanding what each role can do
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg border border-border">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={roleColors.owner}>Owner</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Full access to all settings, billing, and can delete the workspace
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border border-border">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={roleColors.admin}>Admin</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Can manage team members, settings, and all workspace data
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border border-border">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={roleColors.agent}>Agent</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Can create, edit, and manage contacts and companies
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border border-border">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={roleColors.viewer}>Viewer</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Read-only access to workspace data
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="integrations" className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-4">Canais de Comunicação</h2>
              <div className="grid gap-4">
                <InstagramConnectionCard />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>
                  Configure security options for your workspace
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-border">
                  <div>
                    <p className="font-medium">Two-factor authentication</p>
                    <p className="text-sm text-muted-foreground">
                      Require 2FA for all team members
                    </p>
                  </div>
                  <Button variant="outline">Configure</Button>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-border">
                  <div>
                    <p className="font-medium">Session management</p>
                    <p className="text-sm text-muted-foreground">
                      View and manage active sessions
                    </p>
                  </div>
                  <Button variant="outline">View sessions</Button>
                </div>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium">API keys</p>
                    <p className="text-sm text-muted-foreground">
                      Manage API access to your workspace
                    </p>
                  </div>
                  <Button variant="outline">Manage keys</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Choose how you want to be notified
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Notification settings coming soon...
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
