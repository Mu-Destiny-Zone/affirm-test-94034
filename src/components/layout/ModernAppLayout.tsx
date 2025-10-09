import { Bell, Building2, MoveHorizontal as MoreHorizontal } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useNotifications } from "@/hooks/useNotifications";
import { useState, useEffect } from "react";
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { NoOrganizationAccess } from "./NoOrganizationAccess";

interface ModernAppLayoutProps {
  children: React.ReactNode;
}

function LayoutContent({ children }: ModernAppLayoutProps) {
  const { t } = useTranslation();
  const { organizations, currentOrg, setCurrentOrg } = useOrganization();
  const { notifications, loading: notificationsLoading, unreadCount, markAllAsRead, getNotificationIcon, getNotificationUrl } = useNotifications();
  const navigate = useNavigate();
  const [notificationMenuOpen, setNotificationMenuOpen] = useState(false);

  // Auto-mark all as read when dropdown opens
  useEffect(() => {
    if (notificationMenuOpen && unreadCount > 0) {
      markAllAsRead();
    }
  }, [notificationMenuOpen]);

  const handleNotificationClick = (notification: any) => {
    const url = getNotificationUrl(notification);
    if (url !== '/') {
      navigate(url);
    }
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        
        <SidebarInset className="flex flex-col flex-1">
          <header className="flex h-16 items-center gap-4 border-b border-border/60 bg-background/95 backdrop-blur-md px-4 lg:px-6 sticky top-0 z-50 shadow-sm transition-all duration-300 ease-in-out">
            <SidebarTrigger className="hover:bg-accent hover:scale-105 transition-all duration-300 ease-in-out rounded-lg h-9 w-9" />

            <div className="flex-1 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Select
                  value={currentOrg?.id || ""}
                  onValueChange={(value) => {
                    const org = organizations.find(o => o.id === value);
                    if (org) {
                      setCurrentOrg(org);
                    }
                  }}
                >
                  <SelectTrigger className="w-[220px] bg-background border-border/60 hover:border-primary/30 transition-colors font-medium">
                    <Building2 className="h-4 w-4 mr-2 text-primary" />
                    <SelectValue placeholder="Select organization" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id} className="font-medium">
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <DropdownMenu open={notificationMenuOpen} onOpenChange={setNotificationMenuOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="relative hover:bg-accent transition-colors rounded-lg h-10 w-10 p-0"
                    >
                      <Bell className="h-5 w-5" />
                      {unreadCount > 0 && (
                        <Badge
                          variant="destructive"
                          className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center min-w-[20px] shadow-md"
                        >
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </Badge>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-96 max-h-[32rem] overflow-y-auto border-border/60 shadow-xl">
                    <div className="flex items-center justify-between px-2 py-1">
                      <DropdownMenuLabel className="text-sm font-medium">
                        {t('notifications')}
                      </DropdownMenuLabel>
                    </div>
                    
                    <DropdownMenuSeparator />
                    
                    {notificationsLoading ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        Loading notifications...
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        {t('notificationsEmpty')}
                      </div>
                    ) : (
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.map((notification) => (
                          <DropdownMenuItem
                            key={notification.id}
                            className={`flex flex-col items-start gap-1 p-3 cursor-pointer ${
                              !notification.read_at ? 'bg-accent/50' : ''
                            }`}
                            onClick={() => handleNotificationClick(notification)}
                          >
                            <div className="flex items-start justify-between w-full">
                              <div className="flex items-start gap-2 flex-1">
                                <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium text-sm truncate">
                                      {notification.title}
                                    </p>
                                    {!notification.read_at && (
                                      <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                                    )}
                                  </div>
                                  {notification.message && (
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                      {notification.message}
                                    </p>
                                  )}
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </DropdownMenuItem>
                        ))}
                      </div>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto bg-muted/20 transition-all duration-300 ease-in-out">
            <div className="max-w-7xl mx-auto w-full">
              {children}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

export function ModernAppLayout({ children }: ModernAppLayoutProps) {
  const { profile, loading: authLoading } = useAuth();
  const { organizations, loading: orgLoading } = useOrganization();

  // Show loading state while auth or organizations are loading
  if (authLoading || orgLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If user has no organizations, show the "Profile Under Review" screen
  if (organizations.length === 0) {
    return <NoOrganizationAccess />;
  }

  return <LayoutContent>{children}</LayoutContent>;
}