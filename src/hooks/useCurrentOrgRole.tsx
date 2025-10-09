import { useOrganization } from '@/contexts/OrganizationContext';
import { useUserRole } from './useUserRole';

export function useCurrentOrgRole() {
  const { currentOrg } = useOrganization();
  const roleData = useUserRole(currentOrg?.id);
  
  return {
    ...roleData,
    currentOrg
  };
}