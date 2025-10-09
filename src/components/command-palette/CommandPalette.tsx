import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Chrome as Home, TestTube, Bug, Lightbulb, ChartBar as BarChart3, FolderKanban, Users, Settings, Search } from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';

interface Command {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  action: () => void;
  keywords?: string[];
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { organizations, loading: orgLoading } = useOrganization();
  const showHint = !orgLoading && organizations.length > 0;

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const navigateAndClose = useCallback(
    (path: string) => {
      navigate(path);
      setOpen(false);
    },
    [navigate]
  );

  const commands: Command[] = [
    {
      id: 'home',
      label: 'Dashboard',
      description: 'Go to dashboard',
      icon: <Home className="h-4 w-4" />,
      action: () => navigateAndClose('/'),
      keywords: ['home', 'dashboard', 'overview'],
    },
    {
      id: 'tests',
      label: 'Tests',
      description: 'View all tests',
      icon: <TestTube className="h-4 w-4" />,
      action: () => navigateAndClose('/tests'),
      keywords: ['test', 'testing', 'qa'],
    },
    {
      id: 'bugs',
      label: 'Bug Reports',
      description: 'View bug reports',
      icon: <Bug className="h-4 w-4" />,
      action: () => navigateAndClose('/bugs'),
      keywords: ['bug', 'issue', 'defect', 'problem'],
    },
    {
      id: 'suggestions',
      label: 'Suggestions',
      description: 'View suggestions',
      icon: <Lightbulb className="h-4 w-4" />,
      action: () => navigateAndClose('/suggestions'),
      keywords: ['idea', 'feature', 'improvement', 'enhancement'],
    },
    {
      id: 'projects',
      label: 'Projects',
      description: 'View all projects',
      icon: <FolderKanban className="h-4 w-4" />,
      action: () => navigateAndClose('/projects'),
      keywords: ['project', 'workspace'],
    },
    {
      id: 'reports',
      label: 'Reports',
      description: 'View reports and analytics',
      icon: <BarChart3 className="h-4 w-4" />,
      action: () => navigateAndClose('/reports'),
      keywords: ['analytics', 'stats', 'metrics', 'data'],
    },
    {
      id: 'admin-users',
      label: 'User Management',
      description: 'Manage users',
      icon: <Users className="h-4 w-4" />,
      action: () => navigateAndClose('/admin/users'),
      keywords: ['user', 'admin', 'member', 'team'],
    },
    {
      id: 'admin-settings',
      label: 'Settings',
      description: 'Application settings',
      icon: <Settings className="h-4 w-4" />,
      action: () => navigateAndClose('/admin/settings'),
      keywords: ['settings', 'preferences', 'config'],
    },
  ];

  return (
    <>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Navigation">
            {commands.slice(0, 6).map((command) => (
              <CommandItem
                key={command.id}
                onSelect={() => command.action()}
                className="flex items-center gap-2"
              >
                {command.icon}
                <div className="flex flex-col">
                  <span>{command.label}</span>
                  {command.description && (
                    <span className="text-xs text-muted-foreground">
                      {command.description}
                    </span>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Administration">
            {commands.slice(6).map((command) => (
              <CommandItem
                key={command.id}
                onSelect={() => command.action()}
                className="flex items-center gap-2"
              >
                {command.icon}
                <div className="flex flex-col">
                  <span>{command.label}</span>
                  {command.description && (
                    <span className="text-xs text-muted-foreground">
                      {command.description}
                    </span>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>

{showHint && (
  <div className="fixed bottom-4 right-4 bg-muted/80 backdrop-blur-sm text-muted-foreground text-xs px-3 py-2 rounded-lg shadow-sm pointer-events-none">
    Press <kbd className="px-1.5 py-0.5 bg-background rounded border">⌘</kbd>{' '}
    <kbd className="px-1.5 py-0.5 bg-background rounded border">K</kbd> to open
    command palette
  </div>
)}
    </>
  );
}
