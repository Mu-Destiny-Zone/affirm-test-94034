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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Edit, Save, X } from 'lucide-react';

interface EditUserDialogProps {
  user: {
    id: string;
    email: string;
    display_name: string;
  };
  onUserUpdated: () => void;
}

export function EditUserDialog({ user, onUserUpdated }: EditUserDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    display_name: '',
    email: ''
  });

  useEffect(() => {
    if (open && user) {
      setFormData({
        display_name: user.display_name || '',
        email: user.email || ''
      });
    }
  }, [open, user]);

  const resetForm = () => {
    setFormData({
      display_name: '',
      email: ''
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.display_name.trim()) {
      toast({
        title: 'Error',
        description: 'Display name is required',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          display_name: formData.display_name.trim(),
          email: formData.email.trim() || null
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      toast({
        title: 'Success',
        description: 'User profile updated successfully'
      });

      setOpen(false);
      resetForm();
      onUserUpdated();
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update user profile',
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
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit User Profile</DialogTitle>
          <DialogDescription>
            Update user profile information. Changes will be applied immediately.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="display_name">Display Name *</Label>
            <Input
              id="display_name"
              type="text"
              value={formData.display_name}
              onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
              placeholder="Enter display name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="user@example.com"
            />
            <p className="text-xs text-muted-foreground">
              Note: Changing email here only updates the profile display. Auth email remains unchanged.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}