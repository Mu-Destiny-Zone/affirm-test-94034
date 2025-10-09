import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Building } from 'lucide-react';

interface UserOrgsDisplayProps {
  userId: string;
}

interface UserOrg {
  org_id: string;
  org_name: string;
  role: string;
}

export function UserOrgsDisplay({ userId }: UserOrgsDisplayProps) {
  const [userOrgs, setUserOrgs] = useState<UserOrg[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserOrgs();
  }, [userId]);

  const fetchUserOrgs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('org_members')
        .select(`
          org_id,
          role,
          orgs!inner(
            name
          )
        `)
        .eq('profile_id', userId)
        .is('deleted_at', null);

      if (error) throw error;

      const orgs = data?.map((member: any) => ({
        org_id: member.org_id,
        org_name: member.orgs.name,
        role: member.role
      })) || [];

      setUserOrgs(orgs);
    } catch (error) {
      console.error('Error fetching user orgs:', error);
      setUserOrgs([]);
    } finally {
      setLoading(false);
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

  if (loading) {
    return <div className="text-xs text-muted-foreground">Loading...</div>;
  }

  if (userOrgs.length === 0) {
    return <div className="text-xs text-muted-foreground">No organizations</div>;
  }

  return (
    <div className="space-y-1">
      {userOrgs.map((org) => (
        <div key={org.org_id} className="flex items-center gap-2">
          <Building className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs font-medium">{org.org_name}</span>
          <Badge variant={getRoleBadgeVariant(org.role)} className="text-xs">
            {org.role}
          </Badge>
        </div>
      ))}
    </div>
  );
}