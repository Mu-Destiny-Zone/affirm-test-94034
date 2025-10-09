import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '@/components/ui/enhanced-loading';
import { Separator } from '@/components/ui/separator';

export function SignInForm() {
  const { t } = useTranslation();
  const { signIn, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');  
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await signIn(email, password);
    
    if (error) {
      setError(error.message);
    } else {
      navigate('/');
    }
    
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError('');

    const { error } = await signInWithGoogle();
    
    if (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
    // Note: Don't set loading to false here as the user will be redirected to Google
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/10 to-primary/5 p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-2xl border border-border/50 backdrop-blur-sm bg-card">
          <CardHeader className="text-center space-y-6 pt-10 pb-8">
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full"></div>
                <img
                  src="/lovable-uploads/101aa5de-a3bb-4b94-8914-0c0d627673c1.png"
                  alt="MU Logo"
                  className="h-20 w-auto object-contain relative z-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <CardTitle className="text-3xl font-bold tracking-tight text-foreground">
                MU Online
              </CardTitle>
              <p className="text-base text-muted-foreground">{t('welcomeBack')}</p>
            </div>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <Alert variant="destructive" className="border-destructive/50 bg-destructive/10 animate-slide-up">
                  <AlertDescription className="text-sm font-medium">{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold text-foreground">{t('email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="h-11 border-input bg-background hover:border-primary/30 focus:border-primary transition-all duration-200"
                  placeholder="name@company.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold text-foreground">{t('password')}</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="h-11 border-input bg-background hover:border-primary/30 focus:border-primary transition-all duration-200"
                  placeholder="Enter your password"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-11 text-base font-semibold bg-primary hover:bg-primary-hover shadow-md hover:shadow-lg transition-all duration-200 mt-6"
                disabled={loading || googleLoading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <LoadingSpinner size="sm" />
                    <span>{t('loading')}</span>
                  </div>
                ) : (
                  t('signIn')
                )}
              </Button>

              <div className="relative my-6">
                <Separator />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                  OR
                </span>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleSignIn}
                disabled={loading || googleLoading}
                className="w-full h-11 text-base font-semibold border-2 hover:bg-accent transition-all duration-200"
              >
                {googleLoading ? (
                  <div className="flex items-center gap-2">
                    <LoadingSpinner size="sm" />
                    <span>Connecting to Google...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    <span>Continue with Google</span>
                  </div>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Secure authentication powered by Supabase
        </p>
      </div>
    </div>
  );
}