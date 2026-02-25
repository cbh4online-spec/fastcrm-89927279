import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mail, ShieldCheck } from "lucide-react";
import { useEmailConnections, useDisconnectEmail } from "@/hooks/useEmailConnection";
import { EmailConnectDialog } from "@/components/inbox/EmailConnectDialog";
import { EmailAccountRow } from "./EmailAccountRow";

export function EmailCalendarSettings() {
  const { t } = useTranslation("settings");
  const { data: connections, isLoading } = useEmailConnections();
  const disconnectEmail = useDisconnectEmail();

  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [defaultAccountId, setDefaultAccountId] = useState<string>("");
  const [signature, setSignature] = useState("");
  const [watermarkEnabled, setWatermarkEnabled] = useState(true);

  const handleSetDefault = (id: string) => {
    setDefaultAccountId(id);
  };

  const handleDisconnect = (id: string) => {
    disconnectEmail.mutate({ connectionId: id });
  };

  return (
    <div className="space-y-8">
      {/* Connected Accounts */}
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            {t("emailCalendar_connectedAccounts")}
          </h3>
          <div className="flex items-center gap-1.5 mt-1">
            <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {t("emailCalendar_privacyNotice")}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 rounded-lg bg-muted/50 animate-pulse" />
            ))}
          </div>
        ) : connections && connections.length > 0 ? (
          <div className="space-y-2">
            {connections.map((conn) => (
              <EmailAccountRow
                key={conn.id}
                connection={conn}
                isDefault={defaultAccountId === conn.id || (!defaultAccountId && conn.is_active)}
                onSetDefault={handleSetDefault}
                onDisconnect={handleDisconnect}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border p-6 text-center">
            <Mail className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">{t("emailCalendar_noAccounts")}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("emailCalendar_noAccountsDesc")}</p>
          </div>
        )}

        {/* Connect Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="h-12 justify-start gap-3"
            onClick={() => setShowConnectDialog(true)}
          >
            <div className="h-6 w-6 rounded bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <span className="text-xs font-bold text-red-600 dark:text-red-400">G</span>
            </div>
            {t("emailCalendar_connectGoogle")}
          </Button>
          <Button
            variant="outline"
            className="h-12 justify-start gap-3"
            onClick={() => setShowConnectDialog(true)}
          >
            <div className="h-6 w-6 rounded bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">M</span>
            </div>
            {t("emailCalendar_connectMicrosoft")}
          </Button>
          <Button
            variant="outline"
            className="h-12 justify-start gap-3"
            onClick={() => setShowConnectDialog(true)}
          >
            <div className="h-6 w-6 rounded bg-muted flex items-center justify-center">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            {t("emailCalendar_connectIMAP")}
          </Button>
          <Button
            variant="outline"
            className="h-12 justify-start gap-3"
            onClick={() => setShowConnectDialog(true)}
          >
            <div className="h-6 w-6 rounded bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <span className="text-xs font-bold text-purple-600 dark:text-purple-400">H</span>
            </div>
            {t("emailCalendar_connectHostinger")}
          </Button>
        </div>
      </div>

      <Separator />

      {/* Email Signature */}
      <div className="space-y-3">
        <div>
          <Label className="text-base font-semibold">{t("emailCalendar_signature")}</Label>
          <p className="text-sm text-muted-foreground mt-0.5">{t("emailCalendar_signatureDesc")}</p>
        </div>
        <Textarea
          value={signature}
          onChange={(e) => setSignature(e.target.value)}
          placeholder={t("emailCalendar_signature")}
          className="min-h-[100px]"
        />
      </div>

      <Separator />

      {/* Watermark Toggle */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-base font-semibold">{t("emailCalendar_watermark")}</Label>
          <p className="text-sm text-muted-foreground">{t("emailCalendar_watermarkDesc")}</p>
        </div>
        <Switch checked={watermarkEnabled} onCheckedChange={setWatermarkEnabled} />
      </div>

      <Separator />

      {/* Default Sending Account */}
      <div className="space-y-3">
        <div>
          <Label className="text-base font-semibold">{t("emailCalendar_defaultAccount")}</Label>
          <p className="text-sm text-muted-foreground mt-0.5">{t("emailCalendar_defaultAccountDesc")}</p>
        </div>
        <Select value={defaultAccountId} onValueChange={setDefaultAccountId}>
          <SelectTrigger className="w-full max-w-md">
            <SelectValue placeholder={t("emailCalendar_defaultAccount")} />
          </SelectTrigger>
          <SelectContent>
            {connections?.map((conn) => (
              <SelectItem key={conn.id} value={conn.id}>
                {conn.email_address}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <EmailConnectDialog
        open={showConnectDialog}
        onOpenChange={setShowConnectDialog}
      />
    </div>
  );
}
