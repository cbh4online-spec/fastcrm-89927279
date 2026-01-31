import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AppRole = "super_admin" | "admin" | "user";

export function useUserRole() {
  const { user } = useAuth();

  const { data: roles, isLoading } = useQuery({
    queryKey: ["user-roles", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // First get the profile ID for this auth user
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
        return [];
      }

      if (!profile) {
        console.warn("No profile found for user:", user.id);
        return [];
      }

      // Then get roles using profile.id
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", profile.id);

      if (error) {
        console.error("Error fetching user roles:", error);
        return [];
      }

      return data.map((r) => r.role as AppRole);
    },
    enabled: !!user?.id,
  });

  const isSuperAdmin = roles?.includes("super_admin") ?? false;
  const isAdmin = roles?.includes("admin") ?? false;

  return {
    roles: roles ?? [],
    isSuperAdmin,
    isAdmin,
    isLoading,
  };
}
