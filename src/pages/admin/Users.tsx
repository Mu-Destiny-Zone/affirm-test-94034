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
import { Users, Shield, Trash2, Mail, Search, Building2, ChevronRight, UserCog } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto py-8 space-y-8">
        {/* Modern Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-2 border-primary/20 p-8">
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-primary/20 backdrop-blur-sm">
                    <UserCog className="h-7 w-7 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                      {t('userManagement')}
                    </h1>
                    <p className="text-muted-foreground mt-1">{t('manageUsersAcrossOrganizations')}</p>
                  </div>
                </div>
              </div>
              <CreateOrgDialog onOrgCreated={fetchOrgs} />
            </div>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        </div>

        {/* Organizations Grid */}
        <div className="grid grid-cols-1 gap-6">
          <Card className="border-2 shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Building2 className="h-6 w-6 text-primary" />
                  <div>
                    <CardTitle className="text-2xl">Organizations</CardTitle>
                    <CardDescription className="mt-1">Select an organization to manage its users</CardDescription>
                  </div>
                </div>
                <Badge variant="secondary" className="text-lg px-4 py-1">
                  {orgs.length} Orgs
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px] pr-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {orgs.map((org) => (
                    <button
                      key={org.id}
                      onClick={() => setSelectedOrg(org.id)}
                      className={`group relative p-5 rounded-xl border-2 transition-all duration-200 text-left ${
                        selectedOrg === org.id
                          ? 'border-primary bg-primary/5 shadow-lg scale-[1.02]'
                          : 'border-border hover:border-primary/50 hover:bg-accent/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        {selectedOrg === org.id && (
                          <Badge variant="default" className="text-xs">Active</Badge>
                        )}
                      </div>
                      <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors">
                        {org.name}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-3 w-3" />
                        <span>Click to manage</span>
                      </div>
                      <ChevronRight className={`absolute top-1/2 right-4 -translate-y-1/2 h-5 w-5 transition-all ${
                        selectedOrg === org.id ? 'text-primary opacity-100' : 'opacity-0 group-hover:opacity-50'
                      }`} />
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Users Section */}
          {selectedOrg && (
            <Card className="border-2 shadow-lg">
              <CardHeader className="space-y-4 bg-gradient-to-r from-muted/50 to-transparent">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Team Members</CardTitle>
                      <CardDescription className="mt-1">
                        {filteredUsers.length} members in {orgs.find(o => o.id === selectedOrg)?.name}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1 sm:w-72">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by name or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-11"
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
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="relative">
                      <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-primary" />
                      <Users className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-primary" />
                    </div>
                    <p className="text-muted-foreground mt-4 font-medium">Loading team members...</p>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="p-6 rounded-full bg-gradient-to-br from-muted to-muted/50 mb-4">
                      <Users className="h-14 w-14 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">
                      {searchQuery ? 'No matches found' : 'No users yet'}
                    </h3>
                    <p className="text-muted-foreground text-center mb-6 max-w-sm">
                      {searchQuery 
                        ? 'Try adjusting your search terms' 
                        : 'Get started by adding team members to this organization'}
                    </p>
                    {isOrgAdmin && !searchQuery && (
                      <CreateUserDialog onUserCreated={fetchUsers} />
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredUsers.map((userItem) => (
                      <div
                        key={userItem.id}
                        className="group p-5 rounded-xl border-2 hover:border-primary/50 hover:bg-accent/30 transition-all duration-200"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className="relative">
                              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary via-primary/80 to-primary/60 flex items-center justify-center ring-2 ring-primary/20 ring-offset-2 ring-offset-background">
                                <span className="text-lg font-bold text-primary-foreground">
                                  {userItem.display_name?.charAt(0).toUpperCase() || 'U'}
                                </span>
                              </div>
                              {userItem.org_role === 'admin' && (
                                <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-primary ring-2 ring-background">
                                  <Shield className="h-3 w-3 text-primary-foreground" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-base truncate">
                                  {userItem.display_name || 'Unnamed User'}
                                </h3>
                                {userItem.org_role && (
                                  <Badge variant={getRoleBadgeVariant(userItem.org_role)} className="text-xs">
                                    {userItem.org_role}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Mail className="h-3.5 w-3.5" />
                                <span className="truncate">{userItem.email || 'No email'}</span>
                              </div>
                              <div className="flex items-center gap-3 mt-2">
                                <UserOrgsDisplay userId={userItem.id} />
                                <span className="text-xs text-muted-foreground">
                                  Joined {new Date(userItem.created_at).toLocaleDateString()}
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
      </div>
    </div>
  );
}