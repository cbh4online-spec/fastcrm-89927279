import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  RefreshCw,
  Users,
  ShieldCheck,
  Building2,
} from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

interface WorkspaceMember {
  id: string;
  user_id: string;
  workspace_id: string;
  role: string;
  created_at: string;
  workspaces: {
    id: string;
    name: string;
    slug: string;
  };
}

export function UsersSection() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const { data: members, isLoading, refetch } = useQuery({
    queryKey: ["super-admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspace_members")
        .select(`
          id,
          user_id,
          workspace_id,
          role,
          created_at,
          workspaces (id, name, slug)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as WorkspaceMember[];
    },
  });

  const { data: superAdmins } = useQuery({
    queryKey: ["super-admin-roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("*")
        .eq("role", "super_admin");

      if (error) throw error;
      return data;
    },
  });

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "owner":
        return <Badge className="bg-primary text-primary-foreground">Owner</Badge>;
      case "admin":
        return <Badge className="bg-info text-info-foreground">Admin</Badge>;
      case "member":
        return <Badge variant="secondary">Membro</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  // Group members by user
  const userMap = new Map<string, WorkspaceMember[]>();
  members?.forEach((m) => {
    const existing = userMap.get(m.user_id) || [];
    existing.push(m);
    userMap.set(m.user_id, existing);
  });

  const uniqueUsers = Array.from(userMap.entries()).map(([userId, memberships]) => ({
    userId,
    memberships,
    workspaceCount: memberships.length,
    isOwner: memberships.some((m) => m.role === "owner"),
  }));

  const filteredUsers = uniqueUsers.filter((user) => {
    const matchesSearch = user.memberships.some(
      (m) =>
        m.workspaces?.name?.toLowerCase().includes(search.toLowerCase()) ||
        m.user_id.toLowerCase().includes(search.toLowerCase())
    );
    const matchesRole =
      roleFilter === "all" || user.memberships.some((m) => m.role === roleFilter);
    return matchesSearch && matchesRole;
  });

  const totalUsers = uniqueUsers.length;
  const ownersCount = uniqueUsers.filter((u) => u.isOwner).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Utilizadores</h1>
          <p className="text-muted-foreground">
            Gestão de utilizadores e membros de workspaces
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Utilizadores</p>
                <p className="text-3xl font-bold">{totalUsers}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Owners</p>
                <p className="text-3xl font-bold">{ownersCount}</p>
              </div>
              <Building2 className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Memberships</p>
                <p className="text-3xl font-bold">{members?.length || 0}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Super Admins</p>
                <p className="text-3xl font-bold">{superAdmins?.length || 0}</p>
              </div>
              <ShieldCheck className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por workspace ou user ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as roles</SelectItem>
                <SelectItem value="owner">Owners</SelectItem>
                <SelectItem value="admin">Admins</SelectItem>
                <SelectItem value="member">Membros</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User ID</TableHead>
                  <TableHead>Workspaces</TableHead>
                  <TableHead>Role Principal</TableHead>
                  <TableHead>Primeiro Registo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.userId}>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {user.userId.slice(0, 8)}...
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.memberships.slice(0, 3).map((m) => (
                          <Badge key={m.id} variant="outline" className="text-xs">
                            {m.workspaces?.name}
                          </Badge>
                        ))}
                        {user.memberships.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{user.memberships.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.isOwner
                        ? getRoleBadge("owner")
                        : getRoleBadge(user.memberships[0]?.role || "member")}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(
                        new Date(
                          Math.min(
                            ...user.memberships.map((m) => new Date(m.created_at).getTime())
                          )
                        ),
                        "dd/MM/yyyy",
                        { locale: pt }
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nenhum utilizador encontrado</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
