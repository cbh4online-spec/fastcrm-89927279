import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { UserAvatarUpload } from "@/components/shared/UserAvatarUpload";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Info, Upload, Trash2, Save, Loader2, LogOut } from "lucide-react";

export function ProfileSettings() {
  const { t } = useTranslation("settings");
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [firstName, setFirstName] = useState(
    user?.user_metadata?.first_name || user?.user_metadata?.full_name?.split(" ")[0] || ""
  );
  const [lastName, setLastName] = useState(
    user?.user_metadata?.last_name || user?.user_metadata?.full_name?.split(" ").slice(1).join(" ") || ""
  );
  const [timezone, setTimezone] = useState(
    user?.user_metadata?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
  );
  const [weekStart, setWeekStart] = useState(
    user?.user_metadata?.week_start || "monday"
  );

  const handleSave = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          first_name: firstName,
          last_name: lastName,
          full_name: `${firstName} ${lastName}`.trim(),
          timezone,
          week_start: weekStart,
        },
      });
      if (error) throw error;
      toast.success(t("profile_saved"));
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error(t("profile_error"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const commonTimezones = [
    "Europe/Lisbon",
    "Europe/London",
    "Europe/Madrid",
    "Europe/Paris",
    "Europe/Berlin",
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "America/Sao_Paulo",
    "Asia/Tokyo",
    "Asia/Shanghai",
    "Australia/Sydney",
  ];

  return (
    <div className="space-y-8">
      {/* Info banner */}
      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border text-sm text-muted-foreground">
        <Info className="h-4 w-4 flex-shrink-0" />
        {t("profile_infoBanner")}
      </div>

      {/* Profile Picture */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">{t("profile_picture")}</Label>
        <div className="flex items-center gap-4">
          <UserAvatarUpload
            currentAvatarUrl={user?.user_metadata?.avatar_url}
            userName={`${firstName} ${lastName}`.trim() || user?.email || "User"}
            size="lg"
          />
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{t("profile_pictureHint")}</p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Name fields */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">{t("profile_firstName")}</Label>
          <Input
            id="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">{t("profile_lastName")}</Label>
          <Input
            id="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label>{t("profile_email")}</Label>
        <div className="flex gap-2">
          <Input value={user?.email || ""} disabled className="bg-muted flex-1" />
          <Button variant="outline" size="sm" disabled>
            {t("profile_editEmail")}
          </Button>
        </div>
      </div>

      <Separator />

      {/* Time preferences */}
      <div className="space-y-1">
        <h3 className="text-sm font-medium">{t("profile_timePreferences")}</h3>
        <p className="text-xs text-muted-foreground">{t("profile_timePreferencesDesc")}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t("profile_timezone")}</Label>
          <Select value={timezone} onValueChange={setTimezone}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {commonTimezones.map((tz) => (
                <SelectItem key={tz} value={tz}>
                  {tz}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t("profile_weekStart")}</Label>
          <Select value={weekStart} onValueChange={setWeekStart}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monday">{t("profile_monday")}</SelectItem>
              <SelectItem value="sunday">{t("profile_sunday")}</SelectItem>
              <SelectItem value="saturday">{t("profile_saturday")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("profile_saving")}
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              {t("profile_save")}
            </>
          )}
        </Button>
      </div>

      <Separator />

      {/* Logout */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-destructive">{t("profile_logout")}</h3>
        <p className="text-xs text-muted-foreground">{t("profile_logoutDesc")}</p>
        <Button variant="destructive" size="sm" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          {t("profile_logout")}
        </Button>
      </div>
    </div>
  );
}
