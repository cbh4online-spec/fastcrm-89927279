import { useState, useEffect } from 'react';
import { RefreshCw, Unlink, Link2, Loader2, Cloud, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useGoogleCalendarSync } from '@/hooks/useGoogleCalendarSync';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

interface GoogleCalendarConnectProps {
  calendarId: string;
  className?: string;
}

export function GoogleCalendarConnect({ calendarId, className }: GoogleCalendarConnectProps) {
  const {
    syncConfig,
    isConnected,
    needsOAuth,
    googleCalendars,
    isLoading,
    isSyncing,
    listGoogleCalendars,
    startOAuth,
    connect,
    disconnect,
    syncNow,
  } = useGoogleCalendarSync(calendarId);

  const [selectedGoogleCalendarId, setSelectedGoogleCalendarId] = useState('');
  const [showSelector, setShowSelector] = useState(false);

  // Handle OAuth callback - check URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('video_oauth') === 'success' && params.get('video_provider') === 'google_meet') {
      // Clean URL
      const url = new URL(window.location.href);
      url.searchParams.delete('video_oauth');
      url.searchParams.delete('video_provider');
      window.history.replaceState({}, '', url.toString());
      
      // Auto-list calendars after OAuth success
      setShowSelector(true);
      listGoogleCalendars();
    }
  }, [listGoogleCalendars]);

  const handleConnect = async () => {
    if (!showSelector) {
      setShowSelector(true);
      await listGoogleCalendars();
      return;
    }

    if (selectedGoogleCalendarId) {
      const success = await connect(selectedGoogleCalendarId);
      if (success) {
        setShowSelector(false);
        setSelectedGoogleCalendarId('');
      }
    }
  };

  // If OAuth is needed, show the OAuth button instead
  useEffect(() => {
    if (needsOAuth && showSelector) {
      // OAuth needed - will show OAuth button
    }
  }, [needsOAuth, showSelector]);

  if (isConnected && syncConfig) {
    return (
      <div className={cn("space-y-3", className)}>
        <Separator />
        <div className="flex items-center gap-2">
          <Cloud className="h-4 w-4 text-emerald-500" />
          <span className="text-xs font-medium text-foreground">Google Calendar</span>
          <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-0">
            Ligado
          </Badge>
        </div>

        <div className="text-xs text-muted-foreground">
          Sincronizado com: <span className="font-medium text-foreground">{syncConfig.google_calendar_id}</span>
        </div>

        {syncConfig.last_synced_at && (
          <div className="text-[10px] text-muted-foreground">
            Último sync: {format(new Date(syncConfig.last_synced_at), "dd MMM, HH:mm", { locale: pt })}
          </div>
        )}

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-xs h-8 rounded-xl"
            onClick={syncNow}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3 mr-1" />
            )}
            Sincronizar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-xs h-8 rounded-xl text-destructive hover:text-destructive"
            onClick={disconnect}
            disabled={isLoading}
          >
            <Unlink className="h-3 w-3 mr-1" />
            Desligar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <Separator />
      <div className="flex items-center gap-2">
        <Cloud className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-medium text-foreground">Google Calendar</span>
      </div>

      {/* Show OAuth button when tokens are missing */}
      {needsOAuth && showSelector && (
        <div className="space-y-2">
          <p className="text-[10px] text-muted-foreground">
            Precisa autorizar o acesso ao Google Calendar.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="w-full text-xs h-8 rounded-xl"
            onClick={startOAuth}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <ExternalLink className="h-3 w-3 mr-1" />
            )}
            Autorizar Google Calendar
          </Button>
        </div>
      )}

      {/* Show calendar selector when calendars are available */}
      {showSelector && !needsOAuth && (
        <Select value={selectedGoogleCalendarId} onValueChange={setSelectedGoogleCalendarId}>
          <SelectTrigger className="h-8 text-xs rounded-xl">
            <SelectValue placeholder="Selecionar calendário Google..." />
          </SelectTrigger>
          <SelectContent>
            {googleCalendars.map((gc) => (
              <SelectItem key={gc.id} value={gc.id} className="text-xs">
                {gc.summary} {gc.primary && '(Principal)'}
              </SelectItem>
            ))}
            {googleCalendars.length === 0 && !isLoading && (
              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                Nenhum calendário encontrado.
              </div>
            )}
          </SelectContent>
        </Select>
      )}

      {/* Main action button - only show when not in OAuth state */}
      {!needsOAuth && (
        <Button
          size="sm"
          variant="outline"
          className="w-full text-xs h-8 rounded-xl"
          onClick={handleConnect}
          disabled={isLoading || (showSelector && !selectedGoogleCalendarId)}
        >
          {isLoading ? (
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          ) : (
            <Link2 className="h-3 w-3 mr-1" />
          )}
          {showSelector ? 'Confirmar ligação' : 'Ligar ao Google Calendar'}
        </Button>
      )}
    </div>
  );
}
