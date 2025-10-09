import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Organization {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  created_at: string;
}

interface OrganizationContextType {
  organizations: Organization[];
  currentOrg: Organization | null;
  setCurrentOrg: (org: Organization) => void;
  loading: boolean;
  refreshOrganizations: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrganizations = async () => {
    // Always enter a loading state when (re)fetching, especially when user just became available
    setLoading(true);

    if (!user) {
      // If auth is still loading, keep org loading true to avoid false "no org" screens
      if (authLoading) {
        return;
      }
      // When fully signed out, clear and stop loading
      setOrganizations([]);
      setCurrentOrg(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('orgs')
        .select('*')
        .is('deleted_at', null)
        .order('name');

      if (error) throw error;

      setOrganizations(data || []);
      
      // Set current org from localStorage or first org
      const savedOrgId = localStorage.getItem('currentOrgId');
      if (savedOrgId && data) {
        const savedOrg = data.find(org => org.id === savedOrgId);
        if (savedOrg) {
          setCurrentOrg(savedOrg);
        } else if (data.length > 0) {
          setCurrentOrg(data[0]);
          localStorage.setItem('currentOrgId', data[0].id);
        } else {
          setCurrentOrg(null);
          localStorage.removeItem('currentOrgId');
        }
      } else if (data && data.length > 0) {
        setCurrentOrg(data[0]);
        localStorage.setItem('currentOrgId', data[0].id);
      } else {
        setCurrentOrg(null);
        localStorage.removeItem('currentOrgId');
      }
    } catch (error: any) {
      console.error('Error fetching organizations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load organizations',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSetCurrentOrg = (org: Organization) => {
    setCurrentOrg(org);
    localStorage.setItem('currentOrgId', org.id);
  };

  useEffect(() => {
    if (authLoading) return;
    fetchOrganizations();
  }, [user, authLoading]);

  return (
    <OrganizationContext.Provider value={{
      organizations,
      currentOrg,
      setCurrentOrg: handleSetCurrentOrg,
      loading,
      refreshOrganizations: fetchOrganizations
    }}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}