import React, { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Chrome as Home, TestTube, Bug, Lightbulb, ChartBar as BarChart3, Settings, Users, User, LogOut, Moon, Sun, Monitor, Languages, ClipboardList } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/components/theme/ThemeProvider";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarSeparator, useSidebar } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
const navigation = [{
  name: 'myTasks',
  href: '/',
  icon: ClipboardList
}, {
  name: 'tests',
  href: '/tests',
  icon: TestTube
}, {
  name: 'bugs',
  href: '/bugs',
  icon: Bug
}, {
  name: 'suggestions',
  href: '/suggestions',
  icon: Lightbulb
}];
const adminNavigation = [{
  name: 'reports',
  href: '/reports',
  icon: BarChart3
}, {
  name: 'users',
  href: '/admin/users',
  icon: Users
}, {
  name: 'settings',
  href: '/admin/settings',
  icon: Settings
}];
export function AppSidebar() {
  const {
    user,
    profile,
    signOut
  } = useAuth();
  const {
    t,
    i18n
  } = useTranslation();
  const {
    theme,
    setTheme
  } = useTheme();
  const location = useLocation();
  const {
    state,
    isMobile,
    setOpenMobile
  } = useSidebar();
  const collapsed = state === "collapsed";
  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  // Check if user is admin in any org
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }
      try {
        const {
          data
        } = await supabase.from('org_members').select('role').eq('profile_id', user.id).eq('role', 'admin').is('deleted_at', null).limit(1);
        setIsAdmin(data && data.length > 0);
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      }
    };
    checkAdminStatus();
  }, [user]);
  const handleLanguageChange = async (locale: 'en' | 'bg') => {
    i18n.changeLanguage(locale);
    // Update user profile with new language preference
  };
  const handleSignOut = async () => {
    await signOut();
  };
  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };
  return <Sidebar className="border-r border-border/60 bg-card transition-all duration-300 ease-in-out" collapsible="icon">
      <SidebarHeader className={`p-4 border-b border-border/40 ${collapsed ? 'flex justify-center' : ''}`}>
        {!collapsed ? <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center overflow-hidden shadow-lg shadow-primary/20 ring-2 ring-primary/10">
              <img src="/lovable-uploads/5dc1400a-d879-4c3c-a68e-15d5b86bbafb.png" alt="Mu Destiny Zone Logo" className="w-8 h-8 object-contain drop-shadow-sm" />
            </div>
            <div>
              <h2 className="font-bold text-base text-foreground leading-tight">Mu Destiny Zone</h2>
              <p className="text-xs text-muted-foreground font-medium">Test Management</p>
            </div>
          </div> : <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center self-center overflow-hidden shadow-sm mx-0">
            <img src="/lovable-uploads/5dc1400a-d879-4c3c-a68e-15d5b86bbafb.png" alt="Mu Destiny Zone Logo" className="w-7 h-7 object-contain" />
          </div>}

        {profile && <>
            <SidebarSeparator className="my-4" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} py-2 px-2 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer`}>
                  <Avatar className="h-9 w-9 border-2 border-primary/20">
                    <AvatarImage src={profile.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-sm">
                      {profile.display_name?.charAt(0) || profile.email?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  {!collapsed && <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate text-foreground">
                        {profile.display_name || 'User'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        Team Member
                      </p>
                    </div>}
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => window.location.href = '/profile'} className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  Profile Settings
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>}
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup className="mt-2">
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
            {!collapsed && t('navigation')}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {navigation.map(item => <SidebarMenuItem key={item.name}>
                  <Tooltip delayDuration={collapsed ? 0 : 999999}>
                    <TooltipTrigger asChild>
                        <SidebarMenuButton asChild isActive={isActive(item.href)} className="hover:bg-accent hover:scale-[1.02] transition-all duration-300 ease-in-out rounded-lg data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:shadow-md font-medium group-data-[collapsible=icon]:justify-center">
                          <NavLink to={item.href} className={`flex items-center w-full ${collapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2'}`} onClick={handleNavClick}>
                            <item.icon className={`h-5 w-5 flex-shrink-0 ${collapsed ? 'mx-auto' : ''}`} />
                            {!collapsed && <span className="text-sm transition-opacity duration-300">{t(item.name)}</span>}
                          </NavLink>
                        </SidebarMenuButton>
                    </TooltipTrigger>
                    {collapsed && <TooltipContent side="right" className="font-medium">
                        {t(item.name)}
                      </TooltipContent>}
                  </Tooltip>
                </SidebarMenuItem>)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && <SidebarGroup className="mt-6">
            <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
              {!collapsed && t('adminTools')}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {adminNavigation.map(item => <SidebarMenuItem key={item.name}>
                    <Tooltip delayDuration={collapsed ? 0 : 999999}>
                      <TooltipTrigger asChild>
                          <SidebarMenuButton asChild isActive={isActive(item.href)} className="hover:bg-accent hover:scale-[1.02] transition-all duration-300 ease-in-out rounded-lg data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:shadow-md font-medium group-data-[collapsible=icon]:justify-center">
                            <NavLink to={item.href} className={`flex items-center w-full ${collapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2'}`} onClick={handleNavClick}>
                              <item.icon className={`h-5 w-5 flex-shrink-0 ${collapsed ? 'mx-auto' : ''}`} />
                              {!collapsed && <span className="text-sm transition-opacity duration-300">{t(item.name)}</span>}
                            </NavLink>
                          </SidebarMenuButton>
                      </TooltipTrigger>
                      {collapsed && <TooltipContent side="right" className="font-medium">
                          {t(item.name)}
                        </TooltipContent>}
                    </Tooltip>
                  </SidebarMenuItem>)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-border/40 transition-all duration-300 ease-in-out">
        {!collapsed ? <div className="space-y-1 transition-opacity duration-300">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-start hover:bg-accent hover:scale-[1.02] transition-all duration-300 ease-in-out rounded-lg font-medium">
                  {theme === 'dark' ? <Moon className="h-4 w-4 mr-3" /> : theme === 'light' ? <Sun className="h-4 w-4 mr-3" /> : <Monitor className="h-4 w-4 mr-3" />}
                  <span className="text-sm">{t('theme')}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="end" className="w-48">
                <DropdownMenuItem onClick={() => setTheme('light')} className="cursor-pointer">
                  <Sun className="h-4 w-4 mr-2" />
                  {t('light')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('dark')} className="cursor-pointer">
                  <Moon className="h-4 w-4 mr-2" />
                  {t('dark')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('system')} className="cursor-pointer">
                  <Monitor className="h-4 w-4 mr-2" />
                  {t('system')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-start hover:bg-accent hover:scale-[1.02] transition-all duration-300 ease-in-out rounded-lg font-medium">
                  <Languages className="h-4 w-4 mr-3" />
                  <span className="text-sm">{i18n.language === 'bg' ? 'Български' : 'English'}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="end" className="w-48">
                <DropdownMenuItem onClick={() => handleLanguageChange('en')} className="cursor-pointer">
                  English
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleLanguageChange('bg')} className="cursor-pointer">
                  Български
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="ghost" size="sm" onClick={handleSignOut} className="w-full justify-start hover:bg-destructive/10 hover:text-destructive hover:scale-[1.02] transition-all duration-300 ease-in-out rounded-lg font-medium">
              <LogOut className="h-4 w-4 mr-3" />
              <span className="text-sm">{t('signOut')}</span>
            </Button>
          </div> : <div className="flex flex-col gap-1 transition-opacity duration-300">
            {/* Collapsed Theme Toggle */}
            <Tooltip delayDuration={0}>
              <DropdownMenu>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full p-2 hover:bg-accent hover:scale-[1.02] transition-all duration-300 ease-in-out">
                      {theme === 'dark' ? <Moon className="h-4 w-4" /> : theme === 'light' ? <Sun className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <DropdownMenuContent side="right" align="end">
                  <DropdownMenuLabel>{t('theme')}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setTheme('light')}>
                    <Sun className="h-4 w-4 mr-2" />
                    {t('light')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme('dark')}>
                    <Moon className="h-4 w-4 mr-2" />
                    {t('dark')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme('system')}>
                    <Monitor className="h-4 w-4 mr-2" />
                    {t('system')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <TooltipContent side="right" className="font-medium">
                {t('theme')}
              </TooltipContent>
            </Tooltip>

            {/* Collapsed Language Toggle */}
            <Tooltip delayDuration={0}>
              <DropdownMenu>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full p-2 hover:bg-accent hover:scale-[1.02] transition-all duration-300 ease-in-out">
                      <Languages className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <DropdownMenuContent side="right" align="end">
                  <DropdownMenuLabel>{t('language')}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleLanguageChange('en')}>
                    English
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleLanguageChange('bg')}>
                    Български
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <TooltipContent side="right" className="font-medium">
                {t('language')}
              </TooltipContent>
            </Tooltip>

            {/* Collapsed Sign Out */}
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={handleSignOut} className="w-full p-2 hover:bg-destructive/10 hover:text-destructive hover:scale-[1.02] transition-all duration-300 ease-in-out">
                  <LogOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="font-medium">
                {t('signOut')}
              </TooltipContent>
            </Tooltip>
          </div>}
      </SidebarFooter>
    </Sidebar>;
}