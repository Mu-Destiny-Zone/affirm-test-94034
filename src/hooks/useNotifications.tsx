import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useNavigate } from 'react-router-dom';
import { 
  requestNotificationPermission, 
  showDesktopNotification,
  isNotificationSupported 
} from '@/lib/desktopNotifications';

export interface Notification {
  id: string;
  user_id: string;
  org_id: string;
  project_id: string | null;
  type: string;
  title: string;
  message: string | null;
  entity_type: string | null;
  entity_id: string | null;
  read_at: string | null;
  created_at: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [desktopNotificationsEnabled, setDesktopNotificationsEnabled] = useState(false);
  const { user } = useAuth();
  const { currentOrg } = useOrganization();
  const navigate = useNavigate();

  // Request desktop notification permission on mount
  useEffect(() => {
    if (isNotificationSupported()) {
      requestNotificationPermission().then(permission => {
        setDesktopNotificationsEnabled(permission === 'granted');
      });
    }
  }, []);

  const fetchNotifications = async () => {
    if (!user || !currentOrg) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('org_id', currentOrg.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;

      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, read_at: new Date().toISOString() }
            : n
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user || !currentOrg) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('org_id', currentOrg.id)
        .is('read_at', null);

      if (error) throw error;

      // Update local state
      setNotifications(prev => 
        prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Set up real-time subscription
  useEffect(() => {
    if (!user || !currentOrg) return;

    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          if (newNotification.org_id === currentOrg.id) {
            setNotifications(prev => [newNotification, ...prev]);
            
            // Show desktop notification
            if (desktopNotificationsEnabled) {
              const notificationUrl = getNotificationUrl(newNotification);
              showDesktopNotification(
                newNotification.title,
                {
                  body: newNotification.message || undefined,
                  icon: '/favicon.ico',
                  tag: newNotification.id,
                  onClick: () => {
                    navigate(notificationUrl);
                  }
                }
              );
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const updatedNotification = payload.new as Notification;
          if (updatedNotification.org_id === currentOrg.id) {
            setNotifications(prev =>
              prev.map(n =>
                n.id === updatedNotification.id ? updatedNotification : n
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, currentOrg?.id, desktopNotificationsEnabled, navigate]);

  // Fetch notifications when user or org changes
  useEffect(() => {
    fetchNotifications();
  }, [user?.id, currentOrg?.id]);

  const unreadCount = notifications.filter(n => !n.read_at).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'comment_added':
        return '💬';
      case 'vote_received':
        return '👍';
      case 'test_assigned':
        return '📋';
      case 'test_executed':
        return '✅';
      default:
        return '🔔';
    }
  };

  const getNotificationUrl = (notification: Notification) => {
    if (!notification.entity_type || !notification.entity_id) return '/';

    switch (notification.entity_type) {
      case 'bug':
        return `/bugs`;
      case 'suggestion':
        return `/suggestions`;
      case 'test':
        return `/tests`;
      default:
        return '/';
    }
  };

  const enableDesktopNotifications = async () => {
    const permission = await requestNotificationPermission();
    setDesktopNotificationsEnabled(permission === 'granted');
    return permission === 'granted';
  };

  return {
    notifications,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    getNotificationIcon,
    getNotificationUrl,
    refetch: fetchNotifications,
    desktopNotificationsEnabled,
    enableDesktopNotifications
  };
}