import { useState, useEffect } from 'react';
import { Bell, Check, X, CircleAlert as AlertCircle, Info, CircleCheck as CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  title: string;
  message: string | null;
  type: string;
  read_at: string | null;
  created_at: string;
  entity_type: string | null;
  entity_id: string | null;
}

export function NotificationCenter() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      subscribeToNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount(data?.filter((n) => !n.read_at).length || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const subscribeToNotifications = () => {
    if (!user) return;

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId
            ? { ...n, read_at: new Date().toISOString() }
            : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .is('read_at', null);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      const notification = notifications.find((n) => n.id === notificationId);
      if (notification && !notification.read_at) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }

      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      default:
        return <Info className="h-4 w-4 text-blue-600" />;
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle>Notifications</SheetTitle>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs"
              >
                <Check className="h-4 w-4 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-100px)] mt-6">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bell className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">
                No notifications yet
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 rounded-lg border transition-colors ${
                    notification.read_at
                      ? 'bg-background'
                      : 'bg-primary/5 border-primary/20'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {getNotificationIcon(notification.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-medium">
                          {notification.title}
                        </h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => deleteNotification(notification.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      {notification.message && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {notification.message}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(notification.created_at), {
                            addSuffix: true,
                          })}
                        </span>
                        {!notification.read_at && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs"
                            onClick={() => markAsRead(notification.id)}
                          >
                            Mark read
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
