import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentOrgRole } from '@/hooks/useCurrentOrgRole';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, Shield, Save, Building, Plus, Users, FolderOpen, Trash2, BarChart3 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

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
              <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
              <p className="text-muted-foreground">
                You don't have admin privileges for this organization.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedOrgData = organizations.find(org => org.id === selectedOrg);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-6 w-6" />
        <h1 className="text-2xl font-bold">{t('orgManagement')}</h1>
      </div>

      {/* Create New Organization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            {t('newOrganization')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="new-org-name">{t('orgName')}</Label>
              <Input
                id="new-org-name"
                value={newOrgData.name}
                onChange={(e) => generateNewOrgSlug(e.target.value)}
                placeholder="Enter organization name"
              />
            </div>
            <div>
              <Label htmlFor="new-org-slug">{t('orgSlug')}</Label>
              <Input
                id="new-org-slug"
                value={newOrgData.slug}
                onChange={(e) => setNewOrgData({ ...newOrgData, slug: e.target.value })}
                placeholder="organization-slug"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button 
              onClick={handleCreateOrg} 
              disabled={creatingOrg || !newOrgData.name || !newOrgData.slug}
            >
              <Plus className="h-4 w-4 mr-2" />
              {creatingOrg ? t('loading') : t('createOrganization')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Organization Selection */}
      <Card>
        <CardHeader>
          <CardTitle>{t('organizations')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            You can switch organizations using the selector in the header. Currently managing: <strong>{currentOrg?.name}</strong>
          </p>
        </CardContent>
      </Card>

      {selectedOrg && (
        <div className="grid gap-6">
          {/* Organization Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                {t('orgStats')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <Users className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="text-2xl font-bold text-blue-800">{orgStats.userCount}</p>
                    <p className="text-sm text-blue-600">{t('totalUsers')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <FolderOpen className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="text-2xl font-bold text-green-800">{orgStats.projectCount}</p>
                    <p className="text-sm text-green-600">{t('totalProjects')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <Building className="h-8 w-8 text-purple-600" />
                  <div>
                    <p className="text-sm font-medium text-purple-800">{t('createdOn')}</p>
                    <p className="text-sm text-purple-600">
                      {selectedOrgData ? new Date(selectedOrgData.created_at).toLocaleDateString() : '-'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Organization Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Organization Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="org-name">Organization Name</Label>
                  <Input
                    id="org-name"
                    value={orgData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Enter organization name"
                    disabled={!isOrgAdmin}
                  />
                </div>
                <div>
                  <Label htmlFor="org-slug">URL Slug</Label>
                  <Input
                    id="org-slug"
                    value={orgData.slug}
                    onChange={(e) => setOrgData({ ...orgData, slug: e.target.value })}
                    placeholder="organization-slug"
                    disabled={!isOrgAdmin}
                  />
                </div>
              </div>

              {selectedOrgData && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Organization ID</Label>
                    <Input value={selectedOrgData.id} disabled />
                  </div>
                  <div>
                    <Label>Created</Label>
                    <Input 
                      value={new Date(selectedOrgData.created_at).toLocaleDateString()} 
                      disabled 
                    />
                  </div>
                </div>
              )}

              {isOrgAdmin && (
                <div className="flex justify-between">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
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
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {loading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* System Information */}
          <Card>
            <CardHeader>
              <CardTitle>System Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Application Version</Label>
                  <Input value="1.0.0" disabled />
                </div>
                <div>
                  <Label>Database Status</Label>
                  <Input value="Connected" disabled className="text-green-600" />
                </div>
              </div>
              
              <div>
                <Label>System Health</Label>
                <div className="mt-2 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-800 text-sm">
                    ✅ All systems operational
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}