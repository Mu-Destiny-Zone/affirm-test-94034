import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CreateUserDialog } from '@/components/admin/CreateUserDialog';
import { EditUserDialog } from '@/components/admin/EditUserDialog';
import { AssignOrgsDialog } from '@/components/admin/AssignOrgsDialog';
import { CreateOrgDialog } from '@/components/admin/CreateOrgDialog';
import { UserOrgsDisplay } from '@/components/admin/UserOrgsDisplay';
import { ResetPasswordDialog } from '@/components/admin/ResetPasswordDialog';
import { Users, Shield, Trash2, Mail, Search, Building2, ChevronRight, UserCog, UserX } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

type User = {
  id: string;
  email: string;
  display_name: string;
  created_at: string;
  org_role?: string;
};

type UserWithoutOrg = {
  id: string;
  email: string;
  display_name: string;
  created_at: string;
};

export function AdminUsers() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [usersWithoutOrg, setUsersWithoutOrg] = useState<UserWithoutOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingUnassigned, setLoadingUnassigned] = useState(true);
  const [selectedOrg, setSelectedOrg] = useState<string>('');
  const [orgs, setOrgs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [unassignedSearchQuery, setUnassignedSearchQuery] = useState('');
  
  // Get user's org role for the selected org
  const { canManage: isOrgAdmin } = useUserRole(selectedOrg);

  // Filter users based on search
  const filteredUsers = users.filter(u => 
    u.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUnassignedUsers = usersWithoutOrg.filter(u => 
    u.display_name?.toLowerCase().includes(unassignedSearchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(unassignedSearchQuery.toLowerCase())
  );

  useEffect(() => {
    fetchOrgs();
    fetchUsersWithoutOrg();
  }, []);

  useEffect(() => {
    if (selectedOrg) {
      fetchUsers();
    }
  }, [selectedOrg]);

  const fetchOrgs = async () => {
    try {
      const { data, error } = await supabase
        .from('orgs')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      setOrgs(data || []);
      
      // Auto-select first org if available
      if (data && data.length > 0) {
        setSelectedOrg(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching orgs:', error);
    }
  };

  const fetchUsers = async () => {
    if (!selectedOrg) return;
    
    setLoading(true);
    try {
      // Get org members with profile info
      const { data, error } = await supabase
        .from('org_members')
        .select(`
          role,
          profiles!inner(
            id,
            email,
            display_name,
            created_at
          )
        `)
        .eq('org_id', selectedOrg)
        .is('deleted_at', null);

      if (error) throw error;

      const formattedUsers = data?.map((member: any) => ({
        id: member.profiles.id,
        email: member.profiles.email,
        display_name: member.profiles.display_name,
        created_at: member.profiles.created_at,
        org_role: member.role
      })) || [];

      setUsers(formattedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch users',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsersWithoutOrg = async () => {
    setLoadingUnassigned(true);
    try {
      // Get all profiles that don't have any org membership
      const { data: allProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, display_name, created_at')
        .is('deleted_at', null);

      if (profilesError) throw profilesError;

      // Get all profile IDs that have org memberships
      const { data: memberships, error: membershipsError } = await supabase
        .from('org_members')
        .select('profile_id')
        .is('deleted_at', null);

      if (membershipsError) throw membershipsError;

      const memberProfileIds = new Set(memberships?.map(m => m.profile_id) || []);
      
      // Filter out users who have org memberships
      const unassignedUsers = allProfiles?.filter(profile => 
        !memberProfileIds.has(profile.id)
      ) || [];

      setUsersWithoutOrg(unassignedUsers);
    } catch (error) {
      console.error('Error fetching users without org:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch unassigned users',
        variant: 'destructive'
      });
    } finally {
      setLoadingUnassigned(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'manager' | 'tester' | 'viewer') => {
    try {
      const { error } = await supabase.rpc('update_org_member_role' as any, {
        p_org_id: selectedOrg,
        p_profile_id: userId,
        p_role: newRole
      });

      if (error) throw error;

      toast({
        title: t('success'),
        description: t('userUpdated')
      });

      // Refresh users list
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating user role:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update user role',
        variant: 'destructive'
      });
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this user from the organization?')) {
      return;
    }

    try {
      const { error } = await supabase.rpc('soft_remove_org_member' as any, {
        p_org_id: selectedOrg,
        p_profile_id: userId
      });

      if (error) throw error;

      toast({
        title: t('success'),
        description: t('userRemoved')
      });

      // Refresh users list
      fetchUsers();
    } catch (error: any) {
      console.error('Error removing user:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove user',
        variant: 'destructive'
      });
    }
  };

  const handleDisableUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to remove "${userName}" from all organizations you manage?`)) {
      return;
    }

    try {
      const { data, error } = await supabase.rpc('remove_user_from_all_managed_orgs' as any, {
        p_profile_id: userId
      });

      if (error) throw error;

      const count = data || 0;
      toast({ 
        title: t('success'), 
        description: `"${userName}" removed from ${count} organization${count !== 1 ? 's' : ''}` 
      });
      
      fetchUsers();
      fetchUsersWithoutOrg();
    } catch (error: any) {
      console.error('Error disabling user:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to disable user',
        variant: 'destructive'
      });
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'manager': return 'default';
      case 'tester': return 'secondary';
      case 'viewer': return 'outline';
      default: return 'outline';
    }
  };

  if (!isOrgAdmin && selectedOrg) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Shield className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t('accessDenied')}</h3>
              <p className="text-muted-foreground">
                {t('noAdminPrivileges')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-8 animate-fade-in">
      {/* Enhanced Header */}
      <div className="mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-border/50">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="space-y-1">
            <h1 className="flex items-center gap-2">
              <div className="p-1.5 sm:p-2 bg-gradient-brand rounded-lg shadow-brand">
                <UserCog className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <span className="text-xl sm:text-2xl lg:text-3xl font-bold">{t('userManagement')}</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {t('manageUsersAcrossOrganizations')}
            </p>
          </div>
          
          <CreateOrgDialog onOrgCreated={fetchOrgs} />
        </div>
      </div>

      {/* Compact Users Without Organization Section */}
      {usersWithoutOrg.length > 0 && (
          <Card className="border border-destructive/20 shadow-sm">
            <CardHeader className="pb-2 pt-3 px-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <UserX className="h-3.5 w-3.5 text-destructive" />
                  <CardTitle className="text-sm">Unassigned Users</CardTitle>
                  <Badge variant="destructive" className="text-[10px] h-4 px-1.5">
                    {usersWithoutOrg.length}
                  </Badge>
                </div>
                <div className="relative w-48">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    value={unassignedSearchQuery}
                    onChange={(e) => setUnassignedSearchQuery(e.target.value)}
                    className="pl-6 h-6 text-xs"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 px-3 pb-3">
              {loadingUnassigned ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-destructive/20 border-t-destructive" />
                </div>
              ) : filteredUnassignedUsers.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">
                  {unassignedSearchQuery ? 'No matches found' : 'No unassigned users'}
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1.5">
                  {filteredUnassignedUsers.map((userItem) => (
                    <div
                      key={userItem.id}
                      className="group p-2 rounded-lg border hover:border-destructive/40 hover:bg-destructive/5 transition-all"
                    >
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-destructive/80 to-destructive/60 flex items-center justify-center flex-shrink-0">
                          <span className="text-[10px] font-bold text-destructive-foreground">
                            {userItem.display_name?.charAt(0).toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-xs truncate leading-tight">
                            {userItem.display_name || 'Unnamed User'}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate leading-tight">{userItem.email}</p>
                        </div>
                        <AssignOrgsDialog
                          user={{
                            id: userItem.id,
                            email: userItem.email,
                            display_name: userItem.display_name
                          }}
                          onAssignmentUpdated={fetchUsersWithoutOrg}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Organizations Section */}
        <Card className="border-2 shadow-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Organizations</CardTitle>
                <Badge variant="secondary" className="text-sm">
                  {orgs.length}
                </Badge>
              </div>
            </div>
            <CardDescription className="mt-1">Select an organization to manage its users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {orgs.map((org) => (
                <button
                  key={org.id}
                  onClick={() => setSelectedOrg(org.id)}
                  className={`group relative p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                    selectedOrg === org.id
                      ? 'border-primary bg-primary/5 shadow-md'
                      : 'border-border hover:border-primary/50 hover:bg-accent/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/15 transition-colors">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-base truncate group-hover:text-primary transition-colors">
                          {org.name}
                        </h3>
                        {selectedOrg === org.id && (
                          <Badge variant="default" className="text-xs">Active</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">Click to manage users</p>
                    </div>
                    <ChevronRight className={`h-4 w-4 transition-all flex-shrink-0 ${
                      selectedOrg === org.id ? 'text-primary' : 'opacity-0 group-hover:opacity-50'
                    }`} />
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Users Section */}
        {selectedOrg && (
          <Card className="border-2 shadow-md">
            <CardHeader className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className="text-lg">Team Members</CardTitle>
                    <CardDescription className="mt-0.5">
                      {filteredUsers.length} members in {orgs.find(o => o.id === selectedOrg)?.name}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-9"
                    />
                  </div>
                  {isOrgAdmin && (
                    <CreateUserDialog onUserCreated={fetchUsers} />
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary/20 border-t-primary" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <Users className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">
                    {searchQuery ? 'No matches found' : 'No users yet'}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                    {searchQuery 
                      ? 'Try adjusting your search terms' 
                      : 'Get started by adding team members to this organization'}
                  </p>
                  {isOrgAdmin && !searchQuery && (
                    <CreateUserDialog onUserCreated={fetchUsers} />
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredUsers.map((userItem) => (
                    <div
                      key={userItem.id}
                      className="group p-4 rounded-lg border hover:border-primary/50 hover:bg-accent/30 transition-all duration-200"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary via-primary/80 to-primary/60 flex items-center justify-center">
                              <span className="text-sm font-bold text-primary-foreground">
                                {userItem.display_name?.charAt(0).toUpperCase() || 'U'}
                              </span>
                            </div>
                            {userItem.org_role === 'admin' && (
                              <div className="absolute -bottom-0.5 -right-0.5 p-0.5 rounded-full bg-primary ring-2 ring-background">
                                <Shield className="h-2.5 w-2.5 text-primary-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <h3 className="font-semibold text-sm truncate">
                                {userItem.display_name || 'Unnamed User'}
                              </h3>
                              {userItem.org_role && (
                                <Badge variant={getRoleBadgeVariant(userItem.org_role)} className="text-xs">
                                  {userItem.org_role}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              <span className="truncate">{userItem.email || 'No email'}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <UserOrgsDisplay userId={userItem.id} />
                              <span className="text-xs text-muted-foreground">
                                · {new Date(userItem.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {isOrgAdmin && (
                            <>
                              <EditUserDialog
                                user={{
                                  id: userItem.id,
                                  email: userItem.email,
                                  display_name: userItem.display_name
                                }}
                                onUserUpdated={fetchUsers}
                              />
                              <ResetPasswordDialog
                                userId={userItem.id}
                                userEmail={userItem.email}
                              />
                              <AssignOrgsDialog
                                user={{
                                  id: userItem.id,
                                  email: userItem.email,
                                  display_name: userItem.display_name
                                }}
                                onAssignmentUpdated={fetchUsers}
                              />
                              {userItem.id !== user?.id && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoveUser(userItem.id)}
                                  className="hover:bg-destructive/10 hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
    </div>
  );
}