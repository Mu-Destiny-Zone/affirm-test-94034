import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, User, Lock, Camera } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export function ProfileSettings() {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setAvatarUrl(profile.avatar_url || null);
    }
  }, [profile]);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/${Date.now()}.${fileExt}`;

      // Delete old avatar if exists
      if (avatarUrl) {
        const oldPath = avatarUrl.split('/').slice(-2).join('/');
        await supabase.storage.from('avatars').remove([oldPath]);
      }

      // Upload new avatar
      const { error: uploadError, data } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      setAvatarUrl(publicUrl);

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user?.id);

      if (updateError) throw updateError;

      toast({
        title: t('success'),
        description: 'Profile picture updated successfully',
      });
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('profiles')
        .update({ display_name: displayName })
        .eq('id', user?.id);

      if (error) throw error;

      toast({
        title: t('success'),
        description: 'Profile updated successfully',
      });
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    try {
      if (!newPassword || newPassword.length < 6) {
        toast({
          title: t('error'),
          description: 'Password must be at least 6 characters',
          variant: 'destructive',
        });
        return;
      }

      if (newPassword !== confirmPassword) {
        toast({
          title: t('error'),
          description: 'Passwords do not match',
          variant: 'destructive',
        });
        return;
      }

      setChangingPassword(true);

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setNewPassword('');
      setConfirmPassword('');

      toast({
        title: t('success'),
        description: 'Password changed successfully',
      });
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setChangingPassword(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto max-w-4xl space-y-4 sm:space-y-6 py-3 sm:py-6">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2">
          <User className="h-5 w-5 sm:h-6 sm:w-6" />
          Profile Settings
        </h1>
        <p className="text-muted-foreground text-xs sm:text-sm">
          Manage your profile information and preferences
        </p>
      </div>

      {/* Profile Picture */}
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Camera className="h-4 w-4 sm:h-5 sm:w-5" />
            Profile Picture
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">Upload a profile picture</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-4 border-primary/20">
              <AvatarImage src={avatarUrl || undefined} />
              <AvatarFallback className="text-xl sm:text-2xl bg-primary text-primary-foreground">
                {displayName?.charAt(0) || profile?.email?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 w-full space-y-2">
              <Label htmlFor="avatar-upload" className="cursor-pointer">
                <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                  <Upload className="h-3 w-3 sm:h-4 sm:w-4" />
                  Click to upload a new picture
                </div>
              </Label>
              <Input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                disabled={uploading}
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('avatar-upload')?.click()}
                disabled={uploading}
                className="w-full sm:w-auto"
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                    Upload Picture
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Display Name */}
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <User className="h-4 w-4 sm:h-5 sm:w-5" />
            Display Name
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">Update your display name</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="displayName" className="text-xs sm:text-sm">Display Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your display name"
              className="h-9 sm:h-10"
            />
          </div>
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="email" className="text-xs sm:text-sm">Email</Label>
            <Input
              id="email"
              value={profile?.email || ''}
              disabled
              className="bg-muted h-9 sm:h-10"
            />
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              Email cannot be changed
            </p>
          </div>
          <Button onClick={handleSaveProfile} disabled={saving} size="sm" className="w-full sm:w-auto">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Lock className="h-4 w-4 sm:h-5 sm:w-5" />
            Change Password
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">Update your account password</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="newPassword" className="text-xs sm:text-sm">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              className="h-9 sm:h-10"
            />
          </div>
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="confirmPassword" className="text-xs sm:text-sm">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="h-9 sm:h-10"
            />
          </div>
          <Button onClick={handleChangePassword} disabled={changingPassword} size="sm" className="w-full sm:w-auto">
            {changingPassword ? (
              <>
                <Loader2 className="mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                Changing...
              </>
            ) : (
              'Change Password'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
