import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, Save, Building, Plus, Users, FolderOpen, Trash2, Edit, Database, Sparkles, AlertCircle, Shield, Bell, Eye, Activity, TrendingUp } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TransferOwnershipDialog } from '@/components/admin/TransferOwnershipDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

type Organization = {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  created_at: string;
};

type OrgStats = {
  userCount: number;
  projectCount: number;
};

export function AdminSettings() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [allOrgs, setAllOrgs] = useState<Organization[]>([]);
  const [editingOrg, setEditingOrg] = useState<string | null>(null);
  const [orgData, setOrgData] = useState<Record<string, { name: string; slug: string }>>({});
  const [newOrgData, setNewOrgData] = useState({
    name: '',
    slug: ''
  });
  const [orgStats, setOrgStats] = useState<Record<string, OrgStats>>({});
  const [creatingOrg, setCreatingOrg] = useState(false);

  useEffect(() => {
    fetchAllOrgs();
  }, []);

  const fetchAllOrgs = async () => {
    if (!user) return;
    
    try {
      // Fetch all orgs where user is admin or manager
      const { data: memberData, error: memberError } = await supabase
        .from('org_members')
        .select('org_id, role')
        .eq('profile_id', user.id)
        .in('role', ['admin', 'manager'])
        .is('deleted_at', null);

      if (memberError) throw memberError;

      const orgIds = memberData?.map(m => m.org_id) || [];

      if (orgIds.length === 0) {
        setAllOrgs([]);
        return;
      }

      // Fetch org details
      const { data: orgsData, error: orgsError } = await supabase
        .from('orgs')
        .select('*')
        .in('id', orgIds)
        .is('deleted_at', null)
        .order('name');

      if (orgsError) throw orgsError;

      setAllOrgs(orgsData || []);

      // Initialize orgData state
      const dataMap: Record<string, { name: string; slug: string }> = {};
      orgsData?.forEach(org => {
        dataMap[org.id] = { name: org.name, slug: org.slug };
      });
      setOrgData(dataMap);

      // Fetch stats for all orgs
      await fetchAllOrgStats(orgIds);
    } catch (error) {
      console.error('Error fetching orgs:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch organizations',
        variant: 'destructive'
      });
    }
  };

  const fetchAllOrgStats = async (orgIds: string[]) => {
    const statsMap: Record<string, OrgStats> = {};
    
    for (const orgId of orgIds) {
      try {
        const { count: userCount } = await supabase
          .from('org_members')
          .select('*', { count: 'exact', head: true })
          .eq('org_id', orgId)
          .is('deleted_at', null);

        const { count: projectCount } = await supabase
          .from('projects')
          .select('*', { count: 'exact', head: true })
          .eq('org_id', orgId)
          .is('deleted_at', null);

        statsMap[orgId] = {
          userCount: userCount || 0,
          projectCount: projectCount || 0
        };
      } catch (error) {
        console.error(`Error fetching stats for org ${orgId}:`, error);
      }
    }
    
    setOrgStats(statsMap);
  };

  const handleCreateOrg = async () => {
    if (!newOrgData.name || !newOrgData.slug) return;
    if (!user) {
      toast({ title: 'Error', description: 'You must be logged in to create an organization', variant: 'destructive' });
      return;
    }
    
    setCreatingOrg(true);
    try {
      const { data, error } = await supabase
        .from('orgs')
        .insert({
          name: newOrgData.name.trim(),
          slug: newOrgData.slug.trim(),
          owner_id: user.id
        })
        .select()
        .single();

      if (error) throw error;


      

      toast({
        title: 'Success',
        description: t('orgCreated')
      });

      setNewOrgData({ name: '', slug: '' });
      await fetchAllOrgs();
    } catch (error: any) {
      console.error('Error creating organization:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create organization',
        variant: 'destructive'
      });
    } finally {
      setCreatingOrg(false);
    }
  };

  const handleSaveOrg = async (orgId: string) => {
    setLoading(true);
    try {
      const data = orgData[orgId];
      const { error } = await supabase
        .from('orgs')
        .update({
          name: data.name,
          slug: data.slug
        })
        .eq('id', orgId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Organization updated successfully'
      });

      setEditingOrg(null);
      await fetchAllOrgs();
    } catch (error: any) {
      console.error('Error updating organization:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update organization settings',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOrg = async (orgId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('orgs')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', orgId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Organization deleted successfully'
      });

      await fetchAllOrgs();
    } catch (error: any) {
      console.error('Error deleting organization:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete organization',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const generateNewOrgSlug = (name: string) => {
    const slug = generateSlug(name);
    setNewOrgData({ name, slug });
  };

  const handleNameChange = (orgId: string, name: string) => {
    setOrgData(prev => ({
      ...prev,
      [orgId]: {
        name,
        slug: generateSlug(name)
      }
    }));
  };

  return (
    <div className="container mx-auto space-y-6 animate-fade-in">
      {/* Enhanced Header with Stats */}
      <div className="mb-6 pb-4 border-b border-border/50">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="space-y-2">
            <h1 className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-primary to-primary/80 rounded-xl shadow-lg shadow-primary/20">
                <Settings className="h-7 w-7 text-white" />
              </div>
              <span className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">Organization Settings</span>
            </h1>
            <p className="text-sm text-muted-foreground ml-14">
              Configure and manage your organizations
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Card className="px-4 py-2">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-primary" />
                <div>
                  <div className="text-xs text-muted-foreground">Organizations</div>
                  <div className="text-2xl font-bold">{allOrgs.length}</div>
                </div>
              </div>
            </Card>
            <Card className="px-4 py-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <div>
                  <div className="text-xs text-muted-foreground">Total Users</div>
                  <div className="text-2xl font-bold">
                    {Object.values(orgStats).reduce((sum, stat) => sum + stat.userCount, 0)}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Create New Organization */}
      <Card className="border-2 shadow-md">
          <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent">
            <div className="flex items-center gap-3">
              <Plus className="h-6 w-6 text-primary" />
              <div>
                <CardTitle className="text-2xl">Create New Organization</CardTitle>
                <CardDescription className="mt-1">Add a new organization to your account</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="space-y-2">
                <Label htmlFor="new-org-name">Organization Name</Label>
                <Input
                  id="new-org-name"
                  value={newOrgData.name}
                  onChange={(e) => generateNewOrgSlug(e.target.value)}
                  placeholder="Enter organization name"
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-org-slug">URL Slug</Label>
                <Input
                  id="new-org-slug"
                  value={newOrgData.slug}
                  onChange={(e) => setNewOrgData({ ...newOrgData, slug: e.target.value })}
                  placeholder="organization-slug"
                  className="h-11"
                />
              </div>
              <Button 
                onClick={handleCreateOrg} 
                disabled={creatingOrg || !newOrgData.name || !newOrgData.slug}
                size="lg"
                className="h-11"
              >
                <Plus className="h-4 w-4 mr-2" />
                {creatingOrg ? 'Creating...' : 'Create Organization'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Organizations List */}
        <Card className="border-2 shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Building className="h-6 w-6 text-primary" />
              <div>
                <CardTitle className="text-2xl">Your Organizations</CardTitle>
                <CardDescription className="mt-1">Manage and configure your organizations</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {allOrgs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="p-6 rounded-full bg-gradient-to-br from-muted to-muted/50 mb-4">
                  <Building className="h-14 w-14 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No organizations yet</h3>
                <p className="text-muted-foreground text-center mb-6 max-w-sm">
                  Create your first organization to get started
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-4">
                  {allOrgs.map((org) => {
                    const stats = orgStats[org.id] || { userCount: 0, projectCount: 0 };
                    const isEditing = editingOrg === org.id;
                    const data = orgData[org.id] || { name: org.name, slug: org.slug };

                    return (
                      <div
                        key={org.id}
                        className="group p-6 rounded-xl border-2 hover:border-primary/50 hover:shadow-lg transition-all duration-200"
                      >
                        {isEditing ? (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Organization Name</Label>
                                <Input
                                  value={data.name}
                                  onChange={(e) => handleNameChange(org.id, e.target.value)}
                                  placeholder="Organization name"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>URL Slug</Label>
                                <Input
                                  value={data.slug}
                                  onChange={(e) => setOrgData(prev => ({
                                    ...prev,
                                    [org.id]: { ...prev[org.id], slug: e.target.value }
                                  }))}
                                  placeholder="organization-slug"
                                />
                              </div>
                            </div>
                            <div className="flex items-center justify-between pt-4">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="destructive" size="sm">
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Organization</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure? This will permanently delete the organization and all associated data.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteOrg(org.id)} className="bg-destructive text-destructive-foreground">
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                              <div className="flex gap-2">
                                <Button variant="outline" onClick={() => setEditingOrg(null)}>
                                  Cancel
                                </Button>
                                <Button onClick={() => handleSaveOrg(org.id)} disabled={loading}>
                                  <Save className="h-4 w-4 mr-2" />
                                  {loading ? 'Saving...' : 'Save Changes'}
                                </Button>
                              </div>
                            </div>
                          </div>
                         ) : (
                          <>
                            <div className="flex items-start justify-between mb-6">
                              <div className="flex items-center gap-4">
                                <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 ring-2 ring-primary/10">
                                  <Building className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                  <h3 className="text-xl font-bold mb-1">{org.name}</h3>
                                  <p className="text-sm text-muted-foreground font-mono">{org.slug}</p>
                                  <div className="flex items-center gap-2 mt-2">
                                    {org.owner_id === user?.id && (
                                      <Badge variant="secondary" className="text-xs">Owner</Badge>
                                    )}
                                    <Badge variant="outline" className="text-xs">
                                      <Activity className="h-3 w-3 mr-1" />
                                      Active
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <TransferOwnershipDialog 
                                  orgId={org.id}
                                  orgName={org.name}
                                  currentOwnerId={org.owner_id}
                                  onSuccess={fetchAllOrgs}
                                />
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setEditingOrg(org.id)}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </Button>
                              </div>
                            </div>

                            <Tabs defaultValue="overview" className="w-full">
                              <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="overview">Overview</TabsTrigger>
                                <TabsTrigger value="settings">Settings</TabsTrigger>
                                <TabsTrigger value="security">Security</TabsTrigger>
                              </TabsList>
                              
                              <TabsContent value="overview" className="space-y-4 mt-4">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                  <div className="p-4 rounded-lg bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Users className="h-5 w-5 text-primary" />
                                      <span className="text-sm font-medium text-muted-foreground">Users</span>
                                    </div>
                                    <p className="text-3xl font-bold">{stats.userCount}</p>
                                    <p className="text-xs text-muted-foreground mt-1">Team members</p>
                                  </div>
                                  <div className="p-4 rounded-lg bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
                                    <div className="flex items-center gap-2 mb-2">
                                      <FolderOpen className="h-5 w-5 text-primary" />
                                      <span className="text-sm font-medium text-muted-foreground">Projects</span>
                                    </div>
                                    <p className="text-3xl font-bold">{stats.projectCount}</p>
                                    <p className="text-xs text-muted-foreground mt-1">Active projects</p>
                                  </div>
                                  <div className="p-4 rounded-lg bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Database className="h-5 w-5 text-primary" />
                                      <span className="text-sm font-medium text-muted-foreground">Created</span>
                                    </div>
                                    <p className="text-lg font-bold">{new Date(org.created_at).toLocaleDateString()}</p>
                                    <p className="text-xs text-muted-foreground mt-1">Organization age</p>
                                  </div>
                                </div>
                              </TabsContent>

                              <TabsContent value="settings" className="space-y-4 mt-4">
                                <Card className="p-4">
                                  <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                      <div className="space-y-0.5">
                                        <div className="flex items-center gap-2">
                                          <Eye className="h-4 w-4 text-muted-foreground" />
                                          <Label className="text-base font-medium">Public Organization</Label>
                                        </div>
                                        <p className="text-sm text-muted-foreground">Make this organization visible to everyone</p>
                                      </div>
                                      <Switch defaultChecked={false} />
                                    </div>
                                    <Separator />
                                    <div className="flex items-center justify-between">
                                      <div className="space-y-0.5">
                                        <div className="flex items-center gap-2">
                                          <Bell className="h-4 w-4 text-muted-foreground" />
                                          <Label className="text-base font-medium">Email Notifications</Label>
                                        </div>
                                        <p className="text-sm text-muted-foreground">Receive updates about organization activity</p>
                                      </div>
                                      <Switch defaultChecked={true} />
                                    </div>
                                  </div>
                                </Card>
                              </TabsContent>

                              <TabsContent value="security" className="space-y-4 mt-4">
                                <Card className="p-4">
                                  <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                      <Shield className="h-5 w-5 text-primary" />
                                      <div>
                                        <h4 className="font-semibold">Security Settings</h4>
                                        <p className="text-sm text-muted-foreground">Manage access and permissions</p>
                                      </div>
                                    </div>
                                    <Separator />
                                    <div className="flex items-center justify-between">
                                      <div className="space-y-0.5">
                                        <Label className="text-base font-medium">Two-Factor Authentication</Label>
                                        <p className="text-sm text-muted-foreground">Require 2FA for all members</p>
                                      </div>
                                      <Switch defaultChecked={false} />
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <div className="space-y-0.5">
                                        <Label className="text-base font-medium">IP Whitelist</Label>
                                        <p className="text-sm text-muted-foreground">Restrict access to specific IP addresses</p>
                                      </div>
                                      <Switch defaultChecked={false} />
                                    </div>
                                  </div>
                                </Card>
                              </TabsContent>
                            </Tabs>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
    </div>
  );
}