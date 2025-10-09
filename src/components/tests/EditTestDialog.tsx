import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, X, GripVertical, Save } from 'lucide-react';
import { Test, TestStep } from '@/lib/types';

interface EditTestDialogProps {
  test: Test | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTestUpdated: () => void;
}

export function EditTestDialog({ test, open, onOpenChange, onTestUpdated }: EditTestDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [editedTest, setEditedTest] = useState({
    title: '',
    description: '',
    priority: 0,
    status: 'draft' as 'draft' | 'active' | 'archived',
    steps: [] as TestStep[]
  });

  // Initialize form when test changes
  useEffect(() => {
    if (test && open) {
      setEditedTest({
        title: test.title || '',
        description: test.description || '',
        priority: test.priority || 0,
        status: test.status || 'draft',
        steps: test.steps ? [...test.steps] : []
      });
    }
  }, [test, open]);

  if (!test) return null;

  const addStep = () => {
    setEditedTest(prev => ({
      ...prev,
      steps: [...prev.steps, { title: '', expected: '', required: true }]
    }));
  };

  const updateStep = (index: number, field: keyof TestStep, value: any) => {
    setEditedTest(prev => ({
      ...prev,
      steps: prev.steps.map((step, i) => 
        i === index ? { ...step, [field]: value } : step
      )
    }));
  };

  const removeStep = (index: number) => {
    if (editedTest.steps.length > 1) {
      setEditedTest(prev => ({
        ...prev,
        steps: prev.steps.filter((_, i) => i !== index)
      }));
    }
  };

  const handleSave = async () => {
    if (!user || !editedTest.title.trim()) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('tests')
        .update({
          title: editedTest.title.trim(),
          description: editedTest.description.trim() || null,
          priority: editedTest.priority,
          status: editedTest.status,
          steps: editedTest.steps as any,
          updated_at: new Date().toISOString()
        })
        .eq('id', test.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Test updated successfully'
      });

      onOpenChange(false);
      onTestUpdated();
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Test</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-title">Title *</Label>
              <Input
                id="edit-title"
                value={editedTest.title}
                onChange={(e) => setEditedTest(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter test title..."
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editedTest.description}
                onChange={(e) => setEditedTest(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this test validates..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-priority">Priority</Label>
                <Select 
                  value={editedTest.priority.toString()} 
                  onValueChange={(value) => setEditedTest(prev => ({ ...prev, priority: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Low</SelectItem>
                    <SelectItem value="1">Medium</SelectItem>
                    <SelectItem value="2">High</SelectItem>
                    <SelectItem value="3">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select 
                  value={editedTest.status} 
                  onValueChange={(value) => setEditedTest(prev => ({ ...prev, status: value as 'draft' | 'active' | 'archived' }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Test Steps */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Test Steps</Label>
              <Button type="button" variant="outline" size="sm" onClick={addStep}>
                <Plus className="h-4 w-4 mr-2" />
                Add Step
              </Button>
            </div>

            <div className="space-y-3">
              {editedTest.steps.map((step, index) => (
                <Card key={index} className="bg-muted/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        Step {index + 1}
                      </CardTitle>
                      {editedTest.steps.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeStep(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-0">
                    <div className="grid gap-2">
                      <Label htmlFor={`edit-step-${index}-title`}>Action</Label>
                      <Input
                        id={`edit-step-${index}-title`}
                        value={step.title}
                        onChange={(e) => updateStep(index, 'title', e.target.value)}
                        placeholder="What action should be performed?"
                      />
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor={`edit-step-${index}-expected`}>Expected Result</Label>
                      <Textarea
                        id={`edit-step-${index}-expected`}
                        value={step.expected}
                        onChange={(e) => updateStep(index, 'expected', e.target.value)}
                        placeholder="What should happen?"
                        rows={2}
                      />
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`edit-step-${index}-required`}
                        checked={step.required}
                        onCheckedChange={(checked) => updateStep(index, 'required', checked)}
                      />
                      <Label htmlFor={`edit-step-${index}-required`} className="text-sm">
                        Required step (test fails if this step fails)
                      </Label>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading} className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}