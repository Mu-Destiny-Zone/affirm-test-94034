import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building, Plus, X, Save } from 'lucide-react';

interface AssignOrgsDialogProps {
  user: {
    id: string;
    email: string;
    display_name: string;
  };
  onAssignmentUpdated: () => void;
}

interface OrgAssignment {
  org_id: string;
  org_name: string;
  role: 'admin' | 'manager' | 'tester' | 'viewer';
}

export function AssignOrgsDialog({ user, onAssignmentUpdated }: AssignOrgsDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [availableOrgs, setAvailableOrgs] = useState<any[]>([]);
  const [userOrgs, setUserOrgs] = useState<OrgAssignment[]>([]);
  const [newOrgId, setNewOrgId] = useState<string>('');
  const [newOrgRole, setNewOrgRole] = useState<'admin' | 'manager' | 'tester' | 'viewer'>('viewer');

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, user.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all available organizations
      const { data: orgsData, error: orgsError } = await supabase
        .from('orgs')
        .select('id, name')
        .is('deleted_at', null)
        .order('name');

      if (orgsError) throw orgsError;

      // Fetch user's current org memberships
      const { data: memberData, error: memberError } = await supabase
        .from('org_members')
        .select(`
          org_id,
          role,
          orgs!inner(
            name
          )
        `)
        .eq('profile_id', user.id)
        .is('deleted_at', null);

      if (memberError) throw memberError;

      setAvailableOrgs(orgsData || []);
      
      const assignments = memberData?.map((member: any) => ({
        org_id: member.org_id,
        org_name: member.orgs.name,
        role: member.role
      })) || [];
      
      setUserOrgs(assignments);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load organization data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddOrg = async () => {
    if (!newOrgId) {
      toast({
        title: 'Error',
        description: 'Please select an organization',
        variant: 'destructive'
      });
      return;
    }

    // Check if user is already assigned to this org
    if (userOrgs.some(org => org.org_id === newOrgId)) {
      toast({
        title: 'Error',
        description: 'User is already assigned to this organization',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('org_members')
        .insert({
          org_id: newOrgId,
          profile_id: user.id,
          role: newOrgRole
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'User assigned to organization successfully'
      });

      // Refresh data
      await fetchData();
      setNewOrgId('');
      setNewOrgRole('viewer');
    } catch (error: any) {
      console.error('Error assigning user to org:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to assign user to organization',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveOrg = async (orgId: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('org_members')
        .update({ deleted_at: new Date().toISOString() })
        .eq('org_id', orgId)
        .eq('profile_id', user.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'User removed from organization'
      });

      // Refresh data
      await fetchData();
    } catch (error: any) {
      console.error('Error removing user from org:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove user from organization',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = async (orgId: string, newRole: 'admin' | 'manager' | 'tester' | 'viewer') => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('org_members')
        .update({ role: newRole })
        .eq('org_id', orgId)
        .eq('profile_id', user.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'User role updated successfully'
      });

      // Refresh data
      await fetchData();
    } catch (error: any) {
      console.error('Error updating user role:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update user role',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
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

  const availableOrgsForAssignment = availableOrgs.filter(
    org => !userOrgs.some(userOrg => userOrg.org_id === org.id)
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Building className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Manage Organization Assignments</DialogTitle>
          <DialogDescription>
            Assign {user.display_name || user.email} to organizations and manage their roles.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Current Organizations */}
            <div className="space-y-4">
              <h4 className="font-medium">Current Organizations</h4>
              {userOrgs.length === 0 ? (
                <p className="text-sm text-muted-foreground">User is not assigned to any organizations.</p>
              ) : (
                <div className="space-y-3">
                  {userOrgs.map((orgAssignment) => (
                    <Card key={orgAssignment.org_id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Building className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{orgAssignment.org_name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Select 
                              value={orgAssignment.role} 
                              onValueChange={(value: 'admin' | 'manager' | 'tester' | 'viewer') => 
                                handleRoleChange(orgAssignment.org_id, value)
                              }
                              disabled={saving}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="manager">Manager</SelectItem>
                                <SelectItem value="tester">Tester</SelectItem>
                                <SelectItem value="viewer">Viewer</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveOrg(orgAssignment.org_id)}
                              disabled={saving}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Add New Organization */}
            {availableOrgsForAssignment.length > 0 && (
              <div className="space-y-4">
                <h4 className="font-medium">Add to Organization</h4>
                <div className="flex gap-2">
                  <Select value={newOrgId} onValueChange={setNewOrgId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select organization" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableOrgsForAssignment.map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={newOrgRole} onValueChange={(value) => setNewOrgRole(value as 'admin' | 'manager' | 'tester' | 'viewer')}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="tester">Tester</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handleAddOrg} disabled={saving || !newOrgId}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => {
            setOpen(false);
            onAssignmentUpdated();
          }}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}