import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
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
import { Building, Plus, Save, X } from 'lucide-react';

interface CreateOrgDialogProps {
  onOrgCreated: () => void;
}

export function CreateOrgDialog({ onOrgCreated }: CreateOrgDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: ''
  });

  const resetForm = () => {
    setFormData({
      name: '',
      slug: ''
    });
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      slug: generateSlug(name)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: 'Error',
        description: 'Organization name is required',
        variant: 'destructive'
      });
      return;
    }

    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to create an organization',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      // Create organization
      const { data: orgData, error: orgError } = await supabase
        .from('orgs')
        .insert({
          name: formData.name.trim(),
          slug: formData.slug,
          owner_id: user.id
        })
        .select()
        .single();

      if (orgError) throw orgError;

      toast({
        title: 'Success',
        description: 'Organization created successfully'
      });

      setOpen(false);
      resetForm();
      onOrgCreated();
    } catch (error: any) {
      console.error('Error creating organization:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create organization',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Organization
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Organization</DialogTitle>
          <DialogDescription>
            Create a new organization to manage projects and team members.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Organization Name *</Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Enter organization name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">URL Slug</Label>
            <Input
              id="slug"
              type="text"
              value={formData.slug}
              onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
              placeholder="organization-slug"
            />
            <p className="text-xs text-muted-foreground">
              This will be used in URLs. Auto-generated from name if left empty.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Creating...' : 'Create Organization'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}