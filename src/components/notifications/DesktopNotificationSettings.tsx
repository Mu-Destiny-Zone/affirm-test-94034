import { Monitor, Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNotifications } from '@/hooks/useNotifications';
import { isNotificationSupported, getNotificationPermission } from '@/lib/desktopNotifications';

export function DesktopNotificationSettings() {
  const { desktopNotificationsEnabled, enableDesktopNotifications } = useNotifications();

  if (!isNotificationSupported()) {
    return null;
  }

  const permission = getNotificationPermission();

  const handleEnableNotifications = async () => {
    const success = await enableDesktopNotifications();
    if (!success) {
      alert(
        'Please enable notifications in your browser settings. ' +
        'Click the lock icon in the address bar and allow notifications.'
      );
    }
  };

  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
      <Monitor className="h-4 w-4 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium">Desktop Notifications</p>
        <p className="text-[10px] text-muted-foreground">
          {desktopNotificationsEnabled ? 'Enabled' : 'Get notified on your desktop'}
        </p>
      </div>
      {desktopNotificationsEnabled ? (
        <Badge variant="default" className="text-[10px]">
          <Bell className="h-2.5 w-2.5 mr-1" />
          On
        </Badge>
      ) : permission === 'denied' ? (
        <Badge variant="outline" className="text-[10px]">
          <BellOff className="h-2.5 w-2.5 mr-1" />
          Blocked
        </Badge>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={handleEnableNotifications}
          className="h-6 text-xs"
        >
          Enable
        </Button>
      )}
    </div>
  );
}
