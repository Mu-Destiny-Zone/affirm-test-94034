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
import { Users, Shield, Trash2, Mail, Search, UserPlus, Building2, Activity } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type User = {
  id: string;
  email: string;
  display_name: string;
  created_at: string;
  org_role?: string;
};

export function AdminUsers() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrg, setSelectedOrg] = useState<string>('');
  const [orgs, setOrgs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Get user's org role for the selected org
  const { isAdmin: isOrgAdmin } = useUserRole(selectedOrg);

  // Filter users based on search
  const filteredUsers = users.filter(u => 
    u.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    fetchOrgs();
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

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'manager' | 'tester' | 'viewer') => {
    try {
      const { error } = await supabase
        .from('org_members')
        .update({ role: newRole })
        .eq('org_id', selectedOrg)
        .eq('profile_id', userId);

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
      const { error } = await supabase
        .from('org_members')
        .update({ deleted_at: new Date().toISOString() })
        .eq('org_id', selectedOrg)
        .eq('profile_id', userId);

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
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{t('userManagement')}</h1>
              <p className="text-muted-foreground">{t('manageUsersAndPermissions')}</p>
            </div>
          </div>
          <CreateOrgDialog onOrgCreated={fetchOrgs} />
        </div>
      </div>

      {/* Organization Selection Card */}
      <Card className="border-2">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <CardTitle>{t('selectOrganization')}</CardTitle>
          </div>
          <CardDescription>{t('chooseOrgToManage')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Select value={selectedOrg} onValueChange={setSelectedOrg}>
              <SelectTrigger className="w-full sm:w-80">
                <SelectValue placeholder={t('selectOrganization')} />
              </SelectTrigger>
              <SelectContent>
                {orgs.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      {org.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedOrg && isOrgAdmin && (
              <CreateUserDialog onUserCreated={fetchUsers} />
            )}
          </div>
        </CardContent>
      </Card>

      {selectedOrg && (
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full sm:w-auto grid-cols-2 sm:inline-flex">
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              {t('users')}
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-2">
              <Activity className="h-4 w-4" />
              {t('activity')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle>{t('usersInOrganization')}</CardTitle>
                    <CardDescription>{filteredUsers.length} {t('totalUsers')}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1 sm:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder={t('searchUsers')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={fetchUsers}
                      disabled={loading}
                    >
                      <Activity className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4" />
                    <p className="text-muted-foreground">{t('loadingUsers')}</p>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="p-4 rounded-full bg-muted mb-4">
                      <Users className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{t('noUsersFound')}</h3>
                    <p className="text-muted-foreground text-center mb-4">
                      {searchQuery ? t('tryDifferentSearch') : t('noUsersInOrg')}
                    </p>
                    {isOrgAdmin && !searchQuery && (
                      <CreateUserDialog onUserCreated={fetchUsers} />
                    )}
                  </div>
                ) : (
                  <div className="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('user')}</TableHead>
                          <TableHead>{t('email')}</TableHead>
                          <TableHead>{t('organizations')}</TableHead>
                          <TableHead>{t('joined')}</TableHead>
                          <TableHead className="text-right">{t('actions')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map((userItem) => (
                          <TableRow key={userItem.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center ring-2 ring-primary/10">
                                  <span className="text-sm font-semibold text-primary">
                                    {userItem.display_name?.charAt(0).toUpperCase() || 'U'}
                                  </span>
                                </div>
                                <div>
                                  <p className="font-medium">
                                    {userItem.display_name || 'Unnamed User'}
                                  </p>
                                  {userItem.org_role && (
                                    <Badge variant={getRoleBadgeVariant(userItem.org_role)} className="text-xs mt-1">
                                      {userItem.org_role}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{userItem.email || 'No email'}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <UserOrgsDisplay userId={userItem.id} />
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-muted-foreground">
                                {new Date(userItem.created_at).toLocaleDateString()}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-end gap-1">
                                {isOrgAdmin && (
                                  <EditUserDialog
                                    user={{
                                      id: userItem.id,
                                      email: userItem.email,
                                      display_name: userItem.display_name
                                    }}
                                    onUserUpdated={fetchUsers}
                                  />
                                )}
                                {isOrgAdmin && (
                                  <ResetPasswordDialog
                                    userId={userItem.id}
                                    userEmail={userItem.email}
                                  />
                                )}
                                {isOrgAdmin && (
                                  <AssignOrgsDialog
                                    user={{
                                      id: userItem.id,
                                      email: userItem.email,
                                      display_name: userItem.display_name
                                    }}
                                    onAssignmentUpdated={fetchUsers}
                                  />
                                )}
                                {isOrgAdmin && userItem.id !== user?.id && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleRemoveUser(userItem.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle>{t('recentActivity')}</CardTitle>
                <CardDescription>{t('viewRecentUserActivity')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="p-4 rounded-full bg-muted mb-4">
                    <Activity className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">{t('activityTrackingComingSoon')}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}