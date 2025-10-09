import { useTheme } from 'next-themes';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Monitor, Moon, Sun } from 'lucide-react';

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();
  const { profile, updateProfile } = useAuth();

  const changeTheme = async (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    
    // Update profile if user is logged in
    if (profile) {
      await updateProfile({ theme: newTheme });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          {theme === 'light' && <Sun className="h-4 w-4" />}
          {theme === 'dark' && <Moon className="h-4 w-4" />}
          {theme === 'system' && <Monitor className="h-4 w-4" />}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => changeTheme('light')}>
          <Sun className="mr-2 h-4 w-4" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => changeTheme('dark')}>
          <Moon className="mr-2 h-4 w-4" />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => changeTheme('system')}>
          <Monitor className="mr-2 h-4 w-4" />
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}