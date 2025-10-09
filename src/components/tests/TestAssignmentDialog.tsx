import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Test } from '@/lib/types';
import { Users, UserPlus, Calendar, Clock, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Profile {
  id: string;
  display_name: string;
  email: string;
}

interface Assignment {
  id: string;
  assignee_id: string;
  state: 'assigned' | 'in_progress' | 'done' | 'blocked';
  created_at: string;
  due_date?: string;
  notes?: string;
  profiles?: Profile;
}

interface TestAssignmentDialogProps {
  test: Test | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssignmentUpdated: () => void;
}

export function TestAssignmentDialog({ test, open, onOpenChange, onAssignmentUpdated }: TestAssignmentDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [newAssignment, setNewAssignment] = useState({
    assignee_id: '',
    due_date: '',
    notes: ''
  });
  const [selectedDate, setSelectedDate] = useState<Date>();

  useEffect(() => {
    if (open && test) {
      fetchData();
    }
  }, [open, test]);

  const fetchData = async () => {
    if (!test) return;

    try {
      // Fetch project members (profiles in the same org)
      const { data: orgMembersData, error: orgError } = await supabase
        .from('org_members')
        .select(`
          profile_id,
          profiles!inner (
            id,
            display_name,
            email
          )
        `)
        .eq('org_id', test.org_id)
        .is('deleted_at', null);

      if (orgError) throw orgError;

      const profilesData = (orgMembersData || []).map(member => member.profiles).filter(Boolean) as Profile[];
      setProfiles(profilesData);

      // Fetch existing assignments
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('test_assignments')
        .select(`
          *,
          profiles!inner (
            id,
            display_name,
            email
          )
        `)
        .eq('test_id', test.id)
        .is('deleted_at', null);

      if (assignmentsError) throw assignmentsError;
      setAssignments(assignmentsData || []);

    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleAssign = async () => {
    if (!user || !test || !newAssignment.assignee_id) {
      toast({
        title: 'Error',
        description: 'Please select a person to assign',
        variant: 'destructive'
      });
      return;
    }

    // Check if already assigned
    const existingAssignment = assignments.find(a => a.assignee_id === newAssignment.assignee_id);
    if (existingAssignment) {
      toast({
        title: 'Error',
        description: 'This test is already assigned to this person',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('test_assignments')
        .insert({
          org_id: test.org_id,
          project_id: test.project_id,
          test_id: test.id,
          assignee_id: newAssignment.assignee_id,
          state: 'assigned',
          due_date: selectedDate ? selectedDate.toISOString().split('T')[0] : null,
          notes: newAssignment.notes.trim() || null
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Test assigned successfully'
      });

      setNewAssignment({ assignee_id: '', due_date: '', notes: '' });
      setSelectedDate(undefined);
      fetchData();
      onAssignmentUpdated();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case 'assigned': return 'secondary';
      case 'in_progress': return 'default';
      case 'done': return 'default';
      case 'blocked': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStateIcon = (state: string) => {
    switch (state) {
      case 'assigned': return <Clock className="h-3 w-3" />;
      case 'in_progress': return <Users className="h-3 w-3" />;
      case 'done': return <Users className="h-3 w-3" />;
      case 'blocked': return <Users className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  };

  if (!test) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Assign Test: {test.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Existing Assignments */}
          {assignments.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold">Current Assignments</h3>
              <div className="space-y-2">
                {assignments.map((assignment) => (
                  <Card key={assignment.id} className="bg-muted/30">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {assignment.profiles?.display_name || assignment.profiles?.email || 'Unknown User'}
                            </span>
                            <Badge variant={getStateColor(assignment.state)} className="flex items-center gap-1">
                              {getStateIcon(assignment.state)}
                              <span className="capitalize">{assignment.state.replace('_', ' ')}</span>
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Assigned {new Date(assignment.created_at).toLocaleDateString()}
                            {assignment.due_date && (
                              <span> • Due {new Date(assignment.due_date).toLocaleDateString()}</span>
                            )}
                          </div>
                          {assignment.notes && (
                            <p className="text-sm text-muted-foreground">{assignment.notes}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* New Assignment */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Assign to New Person
            </h3>

            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="assignee">Person *</Label>
                <Select value={newAssignment.assignee_id} onValueChange={(value) => setNewAssignment(prev => ({ ...prev, assignee_id: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select person to assign..." />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles.map((profile) => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.display_name || profile.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="due-date">Due Date (optional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? (
                        format(selectedDate, "dd/MM/yyyy")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="assignment-notes">Assignment Notes (optional)</Label>
                <Textarea
                  id="assignment-notes"
                  value={newAssignment.notes}
                  onChange={(e) => setNewAssignment(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Add any specific instructions or context for this assignment..."
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Close
            </Button>
            <Button onClick={handleAssign} disabled={loading || !newAssignment.assignee_id}>
              {loading ? 'Assigning...' : 'Assign Test'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
