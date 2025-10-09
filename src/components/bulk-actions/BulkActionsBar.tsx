import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Trash2, Archive, CircleCheck as CheckCircle, CreditCard as Edit } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface BulkActionsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onDelete?: () => void;
  onArchive?: () => void;
  onMarkComplete?: () => void;
  onStatusChange?: (status: string) => void;
  customActions?: Array<{
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    variant?: 'default' | 'destructive' | 'outline' | 'secondary';
  }>;
}

export function BulkActionsBar({
  selectedCount,
  onClearSelection,
  onDelete,
  onArchive,
  onMarkComplete,
  onStatusChange,
  customActions = [],
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4">
      <div className="bg-primary text-primary-foreground rounded-lg shadow-lg px-4 py-3 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-sm">
            {selectedCount} selected
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="h-8 text-primary-foreground hover:text-primary-foreground/80"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="h-6 w-px bg-primary-foreground/20" />

        <div className="flex items-center gap-2">
          {onMarkComplete && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onMarkComplete}
              className="h-8"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark Complete
            </Button>
          )}

          {onArchive && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onArchive}
              className="h-8"
            >
              <Archive className="h-4 w-4 mr-2" />
              Archive
            </Button>
          )}

          {onStatusChange && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="sm" className="h-8">
                  <Edit className="h-4 w-4 mr-2" />
                  Change Status
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => onStatusChange('new')}>
                  New
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onStatusChange('in_progress')}>
                  In Progress
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onStatusChange('done')}>
                  Done
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {customActions.map((action, index) => (
            <Button
              key={index}
              variant={action.variant || 'secondary'}
              size="sm"
              onClick={action.onClick}
              className="h-8"
            >
              {action.icon}
              {action.label}
            </Button>
          ))}

          {onDelete && (
            <Button
              variant="destructive"
              size="sm"
              onClick={onDelete}
              className="h-8"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
