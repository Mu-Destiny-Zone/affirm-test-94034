import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CreateUserDialog } from '@/components/admin/CreateUserDialog';
import { EditUserDialog } from '@/components/admin/EditUserDialog';
import { AssignOrgsDialog } from '@/components/admin/AssignOrgsDialog';
import { CreateOrgDialog } from '@/components/admin/CreateOrgDialog';
import { UserOrgsDisplay } from '@/components/admin/UserOrgsDisplay';
import { ResetPasswordDialog } from '@/components/admin/ResetPasswordDialog';
import { Users, Shield, CreditCard as Edit, Trash2, Mail } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  
  // Get user's org role for the selected org
  const { isAdmin: isOrgAdmin } = useUserRole(selectedOrg);

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
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6" />
          <h1 className="text-2xl font-bold">{t('userManagement')}</h1>
        </div>
        <CreateOrgDialog onOrgCreated={fetchOrgs} />
      </div>

      {/* Organization Selection */}
      <Card>
        <CardHeader>
          <CardTitle>{t('selectOrganization')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Select value={selectedOrg} onValueChange={setSelectedOrg}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder={t('selectOrganization')} />
              </SelectTrigger>
              <SelectContent>
                {orgs.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
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
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{t('usersInOrganization')}</CardTitle>
              {selectedOrg && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchUsers}
                  disabled={loading}
                >
                  <Users className="h-4 w-4 mr-2" />
                  {t('refreshUsers')}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">{t('loadingUsers')}</p>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8">
                <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{t('noUsersFound')}</p>
              </div>
            ) : (
              <Table>
                 <TableHeader>
                   <TableRow>
                     <TableHead>{t('user')}</TableHead>
                     <TableHead>{t('email')}</TableHead>
                     <TableHead>{t('organizations')}</TableHead>
                     <TableHead>{t('joined')}</TableHead>
                     <TableHead>{t('actions')}</TableHead>
                   </TableRow>
                 </TableHeader>
                <TableBody>
                  {users.map((userItem) => (
                    <TableRow key={userItem.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-medium">
                              {userItem.display_name?.charAt(0).toUpperCase() || 'U'}
                            </span>
                          </div>
                          <span className="font-medium">
                            {userItem.display_name || 'Unnamed User'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          {userItem.email || 'No email'}
                        </div>
                      </TableCell>
                       <TableCell>
                         <UserOrgsDisplay userId={userItem.id} />
                       </TableCell>
                      <TableCell>
                        {new Date(userItem.created_at).toLocaleDateString()}
                      </TableCell>
                       <TableCell>
                         <div className="flex items-center gap-2">
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
                               variant="outline"
                               size="sm"
                               onClick={() => handleRemoveUser(userItem.id)}
                             >
                               <Trash2 className="h-4 w-4" />
                             </Button>
                           )}
                         </div>
                       </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}