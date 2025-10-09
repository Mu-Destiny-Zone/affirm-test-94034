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

type OrgWithUsers = {
  id: string;
  name: string;
  users: User[];
  isAdmin: boolean;
};

export function AdminUsers() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [allOrgsWithUsers, setAllOrgsWithUsers] = useState<OrgWithUsers[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedOrgs, setExpandedOrgs] = useState<Set<string>>(new Set());

  // Filter users across all orgs based on search
  const filteredOrgs = allOrgsWithUsers.map(org => ({
    ...org,
    users: org.users.filter(u => 
      u.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(org => org.users.length > 0 || !searchQuery);

  useEffect(() => {
    if (user) {
      fetchAllOrgsWithUsers();
    }
  }, [user]);

  const fetchAllOrgsWithUsers = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch all orgs where user is admin
      const { data: memberData, error: memberError } = await supabase
        .from('org_members')
        .select('org_id, role')
        .eq('profile_id', user.id)
        .eq('role', 'admin')
        .is('deleted_at', null);

      if (memberError) throw memberError;

      const orgIds = memberData?.map(m => m.org_id) || [];

      if (orgIds.length === 0) {
        setAllOrgsWithUsers([]);
        setLoading(false);
        return;
      }

      // Fetch org details
      const { data: orgsData, error: orgsError } = await supabase
        .from('orgs')
        .select('id, name')
        .in('id', orgIds)
        .is('deleted_at', null)
        .order('name');

      if (orgsError) throw orgsError;

      // Fetch users for each org
      const orgsWithUsers: OrgWithUsers[] = await Promise.all(
        (orgsData || []).map(async (org) => {
          const { data: membersData, error: membersError } = await supabase
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
            .eq('org_id', org.id)
            .is('deleted_at', null);

          if (membersError) {
            console.error(`Error fetching users for org ${org.id}:`, membersError);
            return { ...org, users: [], isAdmin: true };
          }

          const users = membersData?.map((member: any) => ({
            id: member.profiles.id,
            email: member.profiles.email,
            display_name: member.profiles.display_name,
            created_at: member.profiles.created_at,
            org_role: member.role
          })) || [];

          return { ...org, users, isAdmin: true };
        })
      );

      setAllOrgsWithUsers(orgsWithUsers);
      // Auto-expand all orgs initially
      setExpandedOrgs(new Set(orgsWithUsers.map(o => o.id)));
    } catch (error) {
      console.error('Error fetching orgs and users:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch organizations and users',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveUser = async (orgId: string, userId: string) => {
    if (!confirm('Are you sure you want to remove this user from the organization?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('org_members')
        .update({ deleted_at: new Date().toISOString() })
        .eq('org_id', orgId)
        .eq('profile_id', userId);

      if (error) throw error;

      toast({
        title: t('success'),
        description: 'User removed from organization'
      });

      // Refresh data
      fetchAllOrgsWithUsers();
    } catch (error: any) {
      console.error('Error removing user:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove user',
        variant: 'destructive'
      });
    }
  };

  const toggleOrgExpansion = (orgId: string) => {
    setExpandedOrgs(prev => {
      const next = new Set(prev);
      if (next.has(orgId)) {
        next.delete(orgId);
      } else {
        next.add(orgId);
      }
      return next;
    });
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

  const totalUsers = allOrgsWithUsers.reduce((sum, org) => sum + org.users.length, 0);

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
                      User Management
                    </h1>
                    <p className="text-muted-foreground mt-1">Manage users across all your organizations</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Badge variant="secondary" className="text-lg px-4 py-2">
                  <Users className="h-4 w-4 mr-2" />
                  {totalUsers} Users
                </Badge>
                <Badge variant="secondary" className="text-lg px-4 py-2">
                  <Building2 className="h-4 w-4 mr-2" />
                  {allOrgsWithUsers.length} Orgs
                </Badge>
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        </div>

        {/* Search Bar */}
        <Card className="border-2">
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search users across all organizations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-14 text-base"
              />
            </div>
          </CardContent>
        </Card>

        {/* Organizations and Users */}
        {loading ? (
          <Card className="border-2">
            <CardContent className="py-16">
              <div className="flex flex-col items-center justify-center">
                <div className="relative">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-primary" />
                  <Users className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-primary" />
                </div>
                <p className="text-muted-foreground mt-4 font-medium">Loading users...</p>
              </div>
            </CardContent>
          </Card>
        ) : allOrgsWithUsers.length === 0 ? (
          <Card className="border-2">
            <CardContent className="py-16">
              <div className="flex flex-col items-center justify-center">
                <div className="p-6 rounded-full bg-gradient-to-br from-muted to-muted/50 mb-4">
                  <Building2 className="h-14 w-14 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No organizations found</h3>
                <p className="text-muted-foreground text-center mb-6 max-w-sm">
                  You need to be an admin of at least one organization to manage users
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {filteredOrgs.map((org) => {
              const isExpanded = expandedOrgs.has(org.id);
              
              return (
                <Card key={org.id} className="border-2 shadow-lg overflow-hidden">
                  <CardHeader 
                    className="cursor-pointer bg-gradient-to-r from-muted/50 to-transparent hover:from-muted transition-colors"
                    onClick={() => toggleOrgExpansion(org.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-primary/10">
                          <Building2 className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-2xl flex items-center gap-2">
                            {org.name}
                            <ChevronRight className={`h-5 w-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {org.users.length} {org.users.length === 1 ? 'member' : 'members'}
                          </CardDescription>
                        </div>
                      </div>
                      <CreateUserDialog onUserCreated={fetchAllOrgsWithUsers} />
                    </div>
                  </CardHeader>
                  
                  {isExpanded && (
                    <CardContent className="p-6">
                      {org.users.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12">
                          <div className="p-6 rounded-full bg-gradient-to-br from-muted to-muted/50 mb-4">
                            <Users className="h-12 w-12 text-muted-foreground" />
                          </div>
                          <h3 className="text-lg font-semibold mb-2">No users yet</h3>
                          <p className="text-muted-foreground text-center mb-6 max-w-sm">
                            Add team members to this organization
                          </p>
                          <CreateUserDialog onUserCreated={fetchAllOrgsWithUsers} />
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {org.users.map((userItem) => (
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
                                      <span className="text-xs text-muted-foreground">
                                        Joined {new Date(userItem.created_at).toLocaleDateString()}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <EditUserDialog
                                    user={{
                                      id: userItem.id,
                                      email: userItem.email,
                                      display_name: userItem.display_name
                                    }}
                                    onUserUpdated={fetchAllOrgsWithUsers}
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
                                    onAssignmentUpdated={fetchAllOrgsWithUsers}
                                  />
                                  {userItem.id !== user?.id && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleRemoveUser(org.id, userItem.id)}
                                      className="hover:bg-destructive/10 hover:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}