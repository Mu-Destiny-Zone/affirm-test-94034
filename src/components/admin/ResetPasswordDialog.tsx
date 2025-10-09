import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Key, Copy, Eye, EyeOff, CircleAlert as AlertCircle } from 'lucide-react';

interface ResetPasswordDialogProps {
  userId: string;
  userEmail: string;
}

export function ResetPasswordDialog({ userId, userEmail }: ResetPasswordDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  const generatePassword = () => {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    setNewPassword(password);
  };

  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(newPassword);
      toast({
        title: 'Copied',
        description: 'Password copied to clipboard',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy password',
        variant: 'destructive',
      });
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast({
        title: 'Invalid Password',
        description: 'Password must be at least 6 characters long',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        console.error('No active session found');
        throw new Error('No active session. Please log in again.');
      }

      console.log('Attempting password reset for user:', userId);

      const functionUrl = 'https://iadowggdutivqopthbua.supabase.co/functions/v1/admin-reset-password';

      console.log('Calling Edge Function:', functionUrl);

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          newPassword,
        }),
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        let errorMessage = 'Failed to reset password';
        try {
          const errorData = await response.json();
          console.error('Error response:', errorData);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('Password reset successful:', result);

      toast({
        title: 'Success',
        description: `Password has been reset for ${userEmail}`,
      });

      setOpen(false);
      setNewPassword('');
    } catch (error: any) {
      console.error('Error resetting password:', error);

      let errorDescription = error.message || 'Failed to reset password';

      if (error.message?.includes('session')) {
        errorDescription = 'Your session has expired. Please log in again.';
      } else if (error.message?.includes('Unauthorized') || error.message?.includes('401')) {
        errorDescription = 'You are not authorized to reset this password.';
      } else if (error.message?.includes('Insufficient permissions') || error.message?.includes('403')) {
        errorDescription = 'You need admin privileges to reset passwords.';
      } else if (error.message?.includes('NetworkError') || error.message?.includes('fetch')) {
        errorDescription = 'Network error. Please check your connection and try again.';
      }

      toast({
        title: 'Error',
        description: errorDescription,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Key className="h-4 w-4 mr-2" />
          Reset Password
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Reset User Password</DialogTitle>
          <DialogDescription>
            Set a new password for {userEmail}. The user will be able to use this password immediately.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={generatePassword}
                disabled={loading}
              >
                Generate
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Password must be at least 6 characters long
            </p>
          </div>

          {newPassword && (
            <div className="bg-muted p-3 rounded-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Generated Password</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={copyPassword}
                  className="h-8 gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Copy
                </Button>
              </div>
              <code className="text-sm font-mono break-all">{newPassword}</code>
              <p className="text-xs text-muted-foreground mt-2">
                Make sure to copy this password and share it securely with the user
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setOpen(false);
              setNewPassword('');
            }}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleResetPassword} disabled={loading || !newPassword}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
