import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { UserPlus, Copy, Check } from 'lucide-react';

type CreateUserDialogProps = {
  onUserCreated?: () => void;
};

export function CreateUserDialog({ onUserCreated }: CreateUserDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    display_name: '',
    org_id: '',
    role: 'tester' as 'admin' | 'manager' | 'tester' | 'viewer'
  });
  const [orgs, setOrgs] = useState<any[]>([]);
  const [tempPassword, setTempPassword] = useState<string>('');
  const [passwordCopied, setPasswordCopied] = useState(false);

  // Fetch orgs when dialog opens
  const fetchOrgs = async () => {
    try {
      const { data, error } = await supabase
        .from('orgs')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      setOrgs(data || []);
    } catch (error) {
      console.error('Error fetching orgs:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Call the admin edge function to create user
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          email: formData.email,
          display_name: formData.display_name,
          org_id: formData.org_id,
          role: formData.role
        }
      });

      if (error) throw error;

      const temporaryPassword = data?.temporary_password || '';
      setTempPassword(temporaryPassword);

      toast({
        title: 'Success',
        description: `User created successfully!`,
      });

      // Call the callback to refresh user list
      if (onUserCreated) {
        onUserCreated();
      }

      setFormData({
        email: '',
        display_name: '',
        org_id: '',
        role: 'tester'
      });
      // Keep dialog open to show the password
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create user',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      fetchOrgs();
      setTempPassword('');
      setPasswordCopied(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(tempPassword);
      setPasswordCopied(true);
      toast({
        title: t('passwordCopied'),
        description: t('temporaryPassword') + ' copied to clipboard',
      });
      setTimeout(() => setPasswordCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy password:', error);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setTempPassword('');
    setPasswordCopied(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="w-full">
          <UserPlus className="h-4 w-4 mr-2" />
          Create User
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">{t('email')}</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              disabled={loading}
            />
          </div>
          
          <div>
            <Label htmlFor="display_name">Display Name</Label>
            <Input
              id="display_name"
              value={formData.display_name}
              onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
              required
              disabled={loading}
            />
          </div>
          
          <div>
            <Label htmlFor="org">Organization</Label>
            <Select
              value={formData.org_id}
              onValueChange={(value) => setFormData({ ...formData, org_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select organization" />
              </SelectTrigger>
              <SelectContent>
                {orgs.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="role">Role</Label>
            <Select
              value={formData.role}
              onValueChange={(value) => setFormData({ ...formData, role: value as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">{t('admin')}</SelectItem>
                <SelectItem value="manager">{t('manager')}</SelectItem>
                <SelectItem value="tester">{t('tester')}</SelectItem>
                <SelectItem value="viewer">{t('viewer')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {tempPassword && (
            <div className="p-4 bg-muted border border-border rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <Label className="text-foreground font-medium">{t('temporaryPassword')}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={tempPassword}
                  readOnly
                  className="font-mono text-sm bg-background text-foreground"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={copyToClipboard}
                  className="shrink-0"
                >
                  {passwordCopied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Share this password with the user. They will be prompted to change it on first login.
              </p>
            </div>
          )}
          
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              {t('cancel')}
            </Button>
            {!tempPassword ? (
              <Button type="submit" disabled={loading || !formData.org_id}>
                {loading ? t('loading') : t('create')}
              </Button>
            ) : (
              <Button type="button" onClick={handleClose}>
                Done
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}