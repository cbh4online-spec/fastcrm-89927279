import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import i18n from "@/i18n";

const languages = [
  { code: "pt", label: "Português" },
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
];

const dateFormats = [
  { value: "dd/MM/yyyy", label: "DD/MM/YYYY" },
  { value: "MM/dd/yyyy", label: "MM/DD/YYYY" },
  { value: "yyyy-MM-dd", label: "YYYY-MM-DD" },
];

const currencies = [
  { value: "EUR", label: "EUR (€)" },
  { value: "USD", label: "USD ($)" },
  { value: "GBP", label: "GBP (£)" },
  { value: "BRL", label: "BRL (R$)" },
];

export function AppearanceSettings() {
  const { t } = useTranslation("settings");
  const { theme, setTheme } = useTheme();

  const themeOptions = [
    { value: "light", label: t("appearance_light"), icon: Sun },
    { value: "dark", label: t("appearance_dark"), icon: Moon },
    { value: "system", label: t("appearance_system"), icon: Monitor },
  ];

  return (
    <div className="space-y-8">
      {/* Theme */}
      <div className="space-y-3">
        <div>
          <Label className="text-sm font-medium">{t("appearance_theme")}</Label>
          <p className="text-xs text-muted-foreground">{t("appearance_themeDesc")}</p>
        </div>
        <div className="flex gap-2">
          {themeOptions.map((opt) => (
            <Button
              key={opt.value}
              variant={theme === opt.value ? "default" : "outline"}
              size="sm"
              onClick={() => setTheme(opt.value)}
              className="gap-2"
            >
              <opt.icon className="h-4 w-4" />
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Language */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">{t("appearance_language")}</Label>
        <p className="text-xs text-muted-foreground">{t("appearance_languageDesc")}</p>
        <Select value={i18n.language} onValueChange={(v) => i18n.changeLanguage(v)}>
          <SelectTrigger className="w-60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {languages.map((lang) => (
              <SelectItem key={lang.code} value={lang.code}>
                {lang.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Date Format */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">{t("appearance_dateFormat")}</Label>
        <p className="text-xs text-muted-foreground">{t("appearance_dateFormatDesc")}</p>
        <Select defaultValue="dd/MM/yyyy">
          <SelectTrigger className="w-60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {dateFormats.map((fmt) => (
              <SelectItem key={fmt.value} value={fmt.value}>
                {fmt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Currency */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">{t("appearance_currency")}</Label>
        <p className="text-xs text-muted-foreground">{t("appearance_currencyDesc")}</p>
        <Select defaultValue="EUR">
          <SelectTrigger className="w-60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {currencies.map((cur) => (
              <SelectItem key={cur.value} value={cur.value}>
                {cur.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
