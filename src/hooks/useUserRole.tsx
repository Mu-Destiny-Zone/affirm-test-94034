import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'admin' | 'manager' | 'user' | null;

export function useUserRole(orgId?: string) {
  const { user } = useAuth();
  const [orgRole, setOrgRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRoles = async () => {
      if (!user || !orgId) {
        setLoading(false);
        return;
      }

      try {
        // Fetch org role if orgId provided
        if (orgId) {
          const { data: orgRoleData } = await supabase.rpc('org_role', { org_id: orgId });
          setOrgRole(orgRoleData as UserRole);
        }
      } catch (error) {
        console.error('Error fetching user roles:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRoles();
  }, [user, orgId]);

  const isAdmin = orgRole === 'admin';
  const isManager = orgRole === 'manager';
  const canManage = isAdmin || isManager;

  return {
    orgRole,
    isAdmin,
    isManager,
    canManage,
    loading
  };
}