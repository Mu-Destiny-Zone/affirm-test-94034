import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { OrganizationProvider } from "@/contexts/OrganizationContext";
import { ModernAppLayout } from "@/components/layout/ModernAppLayout";
import { SignInForm } from "@/components/auth/SignInForm";
import { CommandPalette } from "@/components/command-palette/CommandPalette";
import { Dashboard } from "./pages/Dashboard";
import { Tests } from "./pages/Tests";
import { Bugs } from "./pages/Bugs";
import { Suggestions } from "./pages/Suggestions";
import { Reports } from "./pages/Reports";
import { MyTasks } from "./pages/MyTasks";
import { AdminUsers } from "./pages/admin/Users";
import { AdminSettings } from "./pages/admin/Settings";
import NotFound from "./pages/NotFound";
import "@/lib/i18n";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function AppContent() {
  const { user, loading } = useAuth();

  return (
    <BrowserRouter>
      {loading ? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading...</p>
          </div>
        </div>
      ) : !user ? (
        <SignInForm />
      ) : (
        <>
          <CommandPalette />
          <ModernAppLayout>
            <Routes>
              <Route path="/" element={<MyTasks />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/tests" element={<Tests />} />
              <Route path="/bugs" element={<Bugs />} />
              <Route path="/suggestions" element={<Suggestions />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/my-tasks" element={<MyTasks />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ModernAppLayout>
        </>
      )}
    </BrowserRouter>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <OrganizationProvider>
        <ThemeProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <AppContent />
          </TooltipProvider>
        </ThemeProvider>
      </OrganizationProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
