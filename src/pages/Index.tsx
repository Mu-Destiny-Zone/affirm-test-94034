import { useAuth } from '@/hooks/useAuth';
import { SignInForm } from '@/components/auth/SignInForm';
import { Dashboard } from './Dashboard';

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <SignInForm />;
  }

  return <Dashboard />;
};

export default Index;
