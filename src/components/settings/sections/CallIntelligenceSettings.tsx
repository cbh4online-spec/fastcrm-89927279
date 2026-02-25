import { useTranslation } from "react-i18next";
import { useCallIntelligenceConfig, CallIntelligenceConfig } from "@/hooks/useCallIntelligenceConfig";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Users, Video, Ban, Languages, Brain, ShieldCheck, Link2, Clock } from "lucide-react";

const RECORD_MODES = [
  { value: "external" as const, icon: Users, recommended: true },
  { value: "all" as const, icon: Video, recommended: false },
  { value: "none" as const, icon: Ban, recommended: false },
] as const;

const LANGUAGES = [
  { value: "pt", label: "Português" },
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
  { value: "it", label: "Italiano" },
];

const RETENTION_OPTIONS = [30, 60, 90, 180, 365];

export function CallIntelligenceSettings() {
  const { t } = useTranslation("settings");
  const { config, isLoading, updateConfig } = useCallIntelligenceConfig();

  const handleUpdate = (updates: Partial<CallIntelligenceConfig>) => {
    updateConfig.mutate(updates);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-48 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Auto-record meetings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("callIntel_autoRecord")}</CardTitle>
          <CardDescription>{t("callIntel_autoRecordDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {RECORD_MODES.map((mode) => {
            const isActive = config.auto_record_mode === mode.value;
            return (
              <button
                key={mode.value}
                onClick={() => handleUpdate({ auto_record_mode: mode.value })}
                className={cn(
                  "w-full flex items-start gap-4 p-4 rounded-lg border-2 transition-all text-left",
                  isActive
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/30"
                )}
              >
                <div className={cn(
                  "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                  isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                )}>
                  <mode.icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-foreground">
                      {t(`callIntel_${mode.value === "external" ? "external" : mode.value === "all" ? "allMeetings" : "none"}`)}
                    </span>
                    {mode.recommended && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {t("callIntel_recommended")}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t(`callIntel_${mode.value === "external" ? "externalDesc" : mode.value === "all" ? "allMeetingsDesc" : "noneDesc"}`)}
                  </p>
                </div>
                <div className={cn(
                  "mt-1 h-4 w-4 rounded-full border-2 shrink-0",
                  isActive ? "border-primary bg-primary" : "border-muted-foreground/40"
                )}>
                  {isActive && (
                    <div className="h-full w-full flex items-center justify-center">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </CardContent>
      </Card>

      {/* AI Transcription & Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-4 w-4" />
            {t("callIntel_transcription")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t("callIntel_transcriptionToggle")}</p>
            </div>
            <Switch
              checked={config.transcription_enabled}
              onCheckedChange={(checked) => handleUpdate({ transcription_enabled: checked })}
            />
          </div>

          {config.transcription_enabled && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Languages className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">{t("callIntel_transcriptionLang")}</p>
              </div>
              <Select
                value={config.transcription_language}
                onValueChange={(v) => handleUpdate({ transcription_language: v })}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="border-t border-border pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{t("callIntel_aiSummaryToggle")}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t("callIntel_aiSummaryDesc")}</p>
              </div>
              <Switch
                checked={config.ai_summary_enabled}
                onCheckedChange={(checked) => handleUpdate({ ai_summary_enabled: checked })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Privacy & CRM */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            {t("callIntel_privacy")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t("callIntel_consent")}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t("callIntel_consentDesc")}</p>
            </div>
            <Switch
              checked={config.consent_notification}
              onCheckedChange={(checked) => handleUpdate({ consent_notification: checked })}
            />
          </div>

          <div className="border-t border-border pt-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{t("callIntel_crmAutoLink")}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t("callIntel_crmAutoLinkDesc")}</p>
                </div>
              </div>
              <Switch
                checked={config.crm_auto_link}
                onCheckedChange={(checked) => handleUpdate({ crm_auto_link: checked })}
              />
            </div>
          </div>

          <div className="border-t border-border pt-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">{t("callIntel_retention")}</p>
              </div>
              <Select
                value={String(config.retention_days)}
                onValueChange={(v) => handleUpdate({ retention_days: Number(v) })}
              >
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RETENTION_OPTIONS.map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      {d} {t("callIntel_retentionDays")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Default insights template */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("callIntel_insightsTemplate")}</CardTitle>
          <CardDescription>{t("callIntel_insightsTemplateDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={config.default_insights_template ?? "none"}
            onValueChange={(v) => handleUpdate({ default_insights_template: v === "none" ? null : v })}
          >
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
    </div>
  );
}
