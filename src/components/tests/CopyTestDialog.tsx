import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Test } from '@/lib/types';

interface Organization {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

import { Copy } from 'lucide-react';

interface CopyTestDialogProps {
  test: Test | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTestCopied?: () => void;
}

export function CopyTestDialog({ test, open, onOpenChange, onTestCopied }: CopyTestDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');

  useEffect(() => {
    if (open) {
      fetchOrganizations();
    }
  }, [open]);

  const fetchOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('orgs')
        .select('*')
        .is('deleted_at', null)
        .order('name');

      if (error) throw error;
      setOrganizations(data || []);
    } catch (error) {
      console.error('Error fetching organizations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load organizations',
        variant: 'destructive',
      });
    }
  };

  const handleCopy = async () => {
    if (!test || !selectedOrgId) return;

    setLoading(true);

    try {
      // Create a copy of the test with new org
      const testCopy = {
        title: test.title,
        description: test.description,
        steps: test.steps as any,
        status: 'draft' as const,
        priority: test.priority,
        tags: test.tags,
        org_id: selectedOrgId,
      };

      const { error } = await supabase
        .from('tests')
        .insert(testCopy);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Test "${test.title}" copied successfully to the selected organization`,
      });

      onOpenChange(false);
      if (onTestCopied) {
        onTestCopied();
      }

      // Reset form
      setSelectedOrgId('');
    } catch (error: any) {
      console.error('Error copying test:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to copy test',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setSelectedOrgId('');
  };

  if (!test) return null;

  const targetOrg = organizations.find(org => org.id === selectedOrgId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Copy Test to Another Organization
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium text-sm mb-2">Copying Test:</h4>
            <p className="font-semibold">{test.title}</p>
            {test.description && (
              <p className="text-sm text-muted-foreground mt-1">{test.description}</p>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="target-org">Target Organization</Label>
              <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {targetOrg && (
              <div className="p-3 bg-primary/10 rounded-lg border">
                <div className="text-sm">
                  <p><strong>Destination:</strong> {targetOrg.name}</p>
                <p className="text-muted-foreground mt-1">
                  The copy will be created as a draft test with the same title.
                </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handleCopy}
              disabled={loading || !selectedOrgId}
            >
              {loading ? 'Copying...' : 'Copy Test'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}