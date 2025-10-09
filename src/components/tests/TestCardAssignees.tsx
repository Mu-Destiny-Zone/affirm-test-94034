import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users } from 'lucide-react';

interface TestAssignee {
  id: string;
  assignee_id: string;
  state: string;
  due_date: string | null;
  profiles: {
    display_name: string | null;
    email: string;
  };
}

interface TestCardAssigneesProps {
  assignees: TestAssignee[];
  canManage?: boolean;
}

export function TestCardAssignees({ assignees, canManage }: TestCardAssigneesProps) {
  if (!canManage || assignees.length === 0) return null;

  return (
    <div className="pt-3">
      <div className="flex items-center gap-2 mb-2">
        <Users className="h-3 w-3 text-muted-foreground" />
        <span className="text-xs text-muted-foreground font-medium">Assigned to:</span>
      </div>
      <div className="grid gap-1">
        {assignees.map((assignee) => (
          <div key={assignee.id} className="grid grid-cols-[20px_1fr_auto] items-center gap-2">
            <Avatar className="h-5 w-5">
              <AvatarImage src="" />
              <AvatarFallback className="text-xs">
                {(assignee.profiles?.display_name || assignee.profiles?.email)
                  ?.split(' ')
                  .map(n => n[0])
                  .join('')
                  .toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground truncate">
              {assignee.profiles?.display_name || assignee.profiles?.email}
            </span>
            <Badge 
              variant={assignee.state === 'done' ? 'default' : 'secondary'} 
              className="text-xs"
            >
              {assignee.state.replace('_', ' ')}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}