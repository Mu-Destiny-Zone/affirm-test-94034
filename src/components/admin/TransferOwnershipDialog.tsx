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
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, UserCog } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TransferOwnershipDialogProps {
  orgId: string;
  orgName: string;
  currentOwnerId: string;
  onSuccess?: () => void;
}

type OrgMember = {
  profile_id: string;
  profiles: {
    display_name: string | null;
    email: string | null;
  };
};

export function TransferOwnershipDialog({ orgId, orgName, currentOwnerId, onSuccess }: TransferOwnershipDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');

  useEffect(() => {
    if (open) {
      fetchMembers();
    }
  }, [open, orgId]);

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('org_members')
        .select(`
          profile_id,
          profiles:profile_id (
            display_name,
            email
          )
        `)
        .eq('org_id', orgId)
        .neq('profile_id', currentOwnerId)
        .is('deleted_at', null);

      if (error) throw error;
      setMembers((data as OrgMember[]) || []);
    } catch (error: any) {
      console.error('Error fetching members:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch organization members',
        variant: 'destructive'
      });
    }
  };

  const handleTransfer = async () => {
    if (!selectedMemberId) return;

    setLoading(true);
    try {
      const { error } = await supabase.rpc('transfer_org_ownership' as any, {
        p_org_id: orgId,
        p_new_owner_id: selectedMemberId
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Organization ownership transferred successfully`
      });

      setOpen(false);
      setSelectedMemberId('');
      onSuccess?.();
    } catch (error: any) {
      console.error('Error transferring ownership:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to transfer ownership',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserCog className="h-4 w-4 mr-2" />
          Transfer Ownership
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Transfer Organization Ownership</DialogTitle>
          <DialogDescription>
            Transfer ownership of "{orgName}" to another member
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You will become an admin member after the transfer. This action cannot be undone.
            </AlertDescription>
          </Alert>

          {members.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No other members available. Add members to the organization before transferring ownership.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="new-owner">Select New Owner</Label>
              <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                <SelectTrigger id="new-owner">
                  <SelectValue placeholder="Choose a member..." />
                </SelectTrigger>
                <SelectContent>
                  {members.map((member) => (
                    <SelectItem key={member.profile_id} value={member.profile_id}>
                      {member.profiles?.display_name || member.profiles?.email || 'Unknown User'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleTransfer} 
            disabled={loading || !selectedMemberId || members.length === 0}
          >
            {loading ? 'Transferring...' : 'Transfer Ownership'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
