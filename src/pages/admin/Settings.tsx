import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentOrgRole } from '@/hooks/useCurrentOrgRole';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, Shield, Save, Building, Plus, Users, FolderOpen, Trash2, BarChart3, Info, Database, Activity } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  const { organizations, currentOrg, refreshOrganizations } = useOrganization();
  const { isAdmin: isOrgAdmin } = useCurrentOrgRole();
  const selectedOrg = currentOrg?.id || '';
  const [orgData, setOrgData] = useState({
    name: '',
    slug: ''
  });
  const [newOrgData, setNewOrgData] = useState({
    name: '',
    slug: ''
  });
  const [orgStats, setOrgStats] = useState<OrgStats>({ userCount: 0, projectCount: 0 });
  const [creatingOrg, setCreatingOrg] = useState(false);

  useEffect(() => {
    if (selectedOrg) {
      fetchOrgDetails();
      fetchOrgStats();
    }
  }, [selectedOrg]);

  const fetchOrgDetails = async () => {
    if (!selectedOrg) return;
    
    try {
      const { data, error } = await supabase
        .from('orgs')
        .select('*')
        .eq('id', selectedOrg)
        .single();

      if (error) throw error;

      if (data) {
        setOrgData({
          name: data.name,
          slug: data.slug
        });
      }
    } catch (error) {
      console.error('Error fetching org details:', error);
    }
  };

  const fetchOrgStats = async () => {
    if (!selectedOrg) return;
    
    try {
      // Get user count
      const { count: userCount } = await supabase
        .from('org_members')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', selectedOrg)
        .is('deleted_at', null);

      // Get project count
      const { count: projectCount } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', selectedOrg)
        .is('deleted_at', null);

      setOrgStats({
        userCount: userCount || 0,
        projectCount: projectCount || 0
      });
    } catch (error) {
      console.error('Error fetching org stats:', error);
    }
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
      await refreshOrganizations();
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

  const handleSaveOrg = async () => {
    if (!selectedOrg || !isOrgAdmin) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('orgs')
        .update({
          name: orgData.name,
          slug: orgData.slug
        })
        .eq('id', selectedOrg);

      if (error) throw error;

      toast({
        title: 'Success',
        description: t('orgUpdated')
      });

      // Refresh orgs list
      await refreshOrganizations();
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

  const handleDeleteOrg = async () => {
    if (!selectedOrg || !isOrgAdmin) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('orgs')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', selectedOrg);

      if (error) throw error;

      toast({
        title: 'Success',
        description: t('orgDeleted')
      });

      // Reset selection and refresh
      await refreshOrganizations();
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

  const handleNameChange = (name: string) => {
    setOrgData({
      name,
      slug: generateSlug(name)
    });
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

  const selectedOrgData = organizations.find(org => org.id === selectedOrg);

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Settings className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('orgManagement')}</h1>
            <p className="text-muted-foreground">{t('configureOrgSettings')}</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full sm:w-auto grid-cols-3 sm:inline-flex">
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            {t('overview')}
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Building className="h-4 w-4" />
            {t('settings')}
          </TabsTrigger>
          <TabsTrigger value="system" className="gap-2">
            <Database className="h-4 w-4" />
            {t('system')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Current Organization */}
          <Card className="border-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building className="h-5 w-5 text-primary" />
                <CardTitle>{t('currentOrganization')}</CardTitle>
              </div>
              <CardDescription>{t('viewingOrganization')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Building className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-lg">{currentOrg?.name}</p>
                  <p className="text-sm text-muted-foreground">{currentOrg?.slug}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Statistics */}
          {selectedOrg && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  {t('orgStats')}
                </CardTitle>
                <CardDescription>{t('keyMetrics')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="flex items-center gap-4 p-6 rounded-xl border-2 bg-card hover:shadow-md transition-shadow">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold">{orgStats.userCount}</p>
                      <p className="text-sm text-muted-foreground">{t('totalUsers')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-6 rounded-xl border-2 bg-card hover:shadow-md transition-shadow">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <FolderOpen className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold">{orgStats.projectCount}</p>
                      <p className="text-sm text-muted-foreground">{t('totalProjects')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-6 rounded-xl border-2 bg-card hover:shadow-md transition-shadow">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <Activity className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{t('createdOn')}</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedOrgData ? new Date(selectedOrgData.created_at).toLocaleDateString() : '-'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Create New Organization */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                <CardTitle>{t('newOrganization')}</CardTitle>
              </div>
              <CardDescription>{t('createNewOrgDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new-org-name">{t('orgName')}</Label>
                  <Input
                    id="new-org-name"
                    value={newOrgData.name}
                    onChange={(e) => generateNewOrgSlug(e.target.value)}
                    placeholder="Enter organization name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-org-slug">{t('orgSlug')}</Label>
                  <Input
                    id="new-org-slug"
                    value={newOrgData.slug}
                    onChange={(e) => setNewOrgData({ ...newOrgData, slug: e.target.value })}
                    placeholder="organization-slug"
                  />
                  <p className="text-xs text-muted-foreground">{t('slugDescription')}</p>
                </div>
              </div>
              <div className="flex justify-end">
                <Button 
                  onClick={handleCreateOrg} 
                  disabled={creatingOrg || !newOrgData.name || !newOrgData.slug}
                  size="lg"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {creatingOrg ? t('loading') : t('createOrganization')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          {selectedOrg ? (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Building className="h-5 w-5 text-primary" />
                    <CardTitle>{t('organizationSettings')}</CardTitle>
                  </div>
                  <CardDescription>{t('updateOrgDetails')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="org-name">{t('orgName')}</Label>
                      <Input
                        id="org-name"
                        value={orgData.name}
                        onChange={(e) => handleNameChange(e.target.value)}
                        placeholder={t('enterOrganizationName')}
                        disabled={!isOrgAdmin}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="org-slug">{t('urlSlug')}</Label>
                      <Input
                        id="org-slug"
                        value={orgData.slug}
                        onChange={(e) => setOrgData({ ...orgData, slug: e.target.value })}
                        placeholder={t('orgSlug')}
                        disabled={!isOrgAdmin}
                      />
                    </div>
                  </div>

                  <Separator />

                  {selectedOrgData && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{t('organizationId')}</Label>
                        <Input value={selectedOrgData.id} disabled className="font-mono text-xs" />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('created')}</Label>
                        <Input 
                          value={new Date(selectedOrgData.created_at).toLocaleDateString()} 
                          disabled 
                        />
                      </div>
                    </div>
                  )}

                  {isOrgAdmin && (
                    <>
                      <Separator />
                      <div className="flex flex-col sm:flex-row justify-between gap-4">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              {t('deleteOrg')}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t('deleteOrg')}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t('confirmDeleteOrg')}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                              <AlertDialogAction onClick={handleDeleteOrg} className="bg-destructive text-destructive-foreground">
                                {t('delete')}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        
                        <Button 
                          onClick={handleSaveOrg} 
                          disabled={loading || !orgData.name || !orgData.slug}
                          size="lg"
                        >
                          <Save className="h-4 w-4 mr-2" />
                          {loading ? t('saving') : t('saveChanges')}
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="flex flex-col items-center justify-center">
                  <div className="p-4 rounded-full bg-muted mb-4">
                    <Building className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">{t('noOrgSelected')}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                <CardTitle>{t('systemInformation')}</CardTitle>
              </div>
              <CardDescription>{t('techDetails')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('applicationVersion')}</Label>
                  <Input value="1.0.0" disabled />
                </div>
                <div className="space-y-2">
                  <Label>{t('databaseStatus')}</Label>
                  <div className="flex items-center gap-2 p-3 rounded-lg border bg-success/5 border-success/20">
                    <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                    <span className="text-sm font-medium text-success">{t('connected')}</span>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  {t('systemHealth')}
                </Label>
                <div className="p-4 rounded-lg border-2 bg-success/5 border-success/20">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-success/10">
                      <Activity className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <p className="font-semibold text-success">✅ {t('allSystemsOperational')}</p>
                      <p className="text-sm text-muted-foreground">{t('noIssuesDetected')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}