import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { BugReport, BugSeverity } from '@/lib/types';
import { Plus, Bug, Edit, User, ExternalLink, AlertTriangle, Clock, Zap, Star } from 'lucide-react';
import { BugFormDialog } from '@/components/forms/BugFormDialog';
import { BugDetailDialog } from '@/components/bugs/BugDetailDialog';
import { EnhancedCard, CardHeader } from '@/components/ui/enhanced-card';
import { FilterPanel } from '@/components/ui/filter-panel';
import { LoadingGrid, LoadingState } from '@/components/ui/enhanced-loading';
import { VotePanel } from '@/components/shared/VotePanel';

export function Bugs() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { currentOrg } = useOrganization();
  const { toast } = useToast();
  const [bugs, setBugs] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingBug, setEditingBug] = useState<BugReport | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [allTags, setAllTags] = useState<string[]>([]);
  const [selectedBug, setSelectedBug] = useState<BugReport | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  useEffect(() => {
    if (user && currentOrg) {
      fetchBugs();
    }
  }, [user, currentOrg]);

  useEffect(() => {
    const tags = bugs.reduce((acc: string[], bug) => {
      if (bug.tags && Array.isArray(bug.tags)) {
        bug.tags.forEach((tag: string) => {
          if (tag && !acc.includes(tag)) {
            acc.push(tag);
          }
        });
      }
      return acc;
    }, []);
    setAllTags(tags.sort());
  }, [bugs]);

  const fetchBugs = async () => {
    if (!currentOrg) {
      setBugs([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('bug_reports')
        .select(`
          *,
          profiles(display_name, email),
          projects(name)
        `)
        .eq('org_id', currentOrg.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive'
        });
      } else {
        const bugsWithSteps = (data || []).map(bug => ({
          ...bug,
          repro_steps: Array.isArray(bug.repro_steps) ? bug.repro_steps as any[] : [],
          profiles: bug.profiles ? {
            ...bug.profiles,
            id: '',
            locale: 'en' as const,
            theme: 'system' as const,
            avatar_url: null,
            created_at: '',
            updated_at: '',
            deleted_at: null
          } : undefined,
          projects: bug.projects || null
        }));
        setBugs(bugsWithSteps);
      }
    } catch (error) {
      console.error('Error fetching bugs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditBug = (bug: BugReport) => {
    setEditingBug(bug);
    setFormDialogOpen(true);
  };

  const handleFormSuccess = () => {
    setEditingBug(null);
    fetchBugs();
  };

  const handleCardClick = (bug: BugReport) => {
    setSelectedBug(bug);
    setDetailDialogOpen(true);
  };

  const handleDetailEdit = (bug: BugReport) => {
    setEditingBug(bug);
    setFormDialogOpen(true);
    setDetailDialogOpen(false);
  };

  const getSeverityColor = (severity: BugSeverity) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const filteredBugs = bugs.filter(bug => {
    const matchesSearch = bug.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bug.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || bug.status === statusFilter;
    const matchesSeverity = severityFilter === 'all' || bug.severity === severityFilter;
    const matchesTag = tagFilter === 'all' || (bug.tags && Array.isArray(bug.tags) && bug.tags.includes(tagFilter));
    
    return matchesSearch && matchesStatus && matchesSeverity && matchesTag;
  });

  // Enhanced filter options with counts
  const filterOptions = {
    severity: [
      { value: 'low', label: 'Low', count: bugs.filter(b => b.severity === 'low').length },
      { value: 'medium', label: 'Medium', count: bugs.filter(b => b.severity === 'medium').length },
      { value: 'high', label: 'High', count: bugs.filter(b => b.severity === 'high').length },
      { value: 'critical', label: 'Critical', count: bugs.filter(b => b.severity === 'critical').length },
    ],
    status: [
      { value: 'new', label: 'New', count: bugs.filter(b => b.status === 'new').length },
      { value: 'triaged', label: 'Triaged', count: bugs.filter(b => b.status === 'triaged').length },
      { value: 'in_progress', label: 'In Progress', count: bugs.filter(b => b.status === 'in_progress').length },
      { value: 'fixed', label: 'Fixed', count: bugs.filter(b => b.status === 'fixed').length },
      { value: 'closed', label: 'Closed', count: bugs.filter(b => b.status === 'closed').length },
      { value: 'duplicate', label: 'Duplicate', count: bugs.filter(b => b.status === 'duplicate').length },
      { value: "won't_fix", label: "Won't Fix", count: bugs.filter(b => b.status === "won't_fix").length },
    ],
    tags: allTags.map(tag => ({
      value: tag,
      label: tag,
      count: bugs.filter(b => b.tags && Array.isArray(b.tags) && b.tags.includes(tag)).length
    }))
  };

  const quickFilters = [
    {
      label: 'My Reports',
      onClick: () => {
        // Filter logic could be added here
      },
      active: false
    },
    {
      label: 'Critical & High',
      onClick: () => {
        setSeverityFilter('high')
      },
      active: severityFilter === 'high' || severityFilter === 'critical'
    },
    {
      label: 'Recent',
      onClick: () => {
        // Sort by recent could be added
      },
      active: false
    }
  ];

  if (loading || !currentOrg) {
    return (
      <div className="container mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Bug className="h-8 w-8 text-destructive" />
              {t('bugReports')}
            </h1>
            <p className="text-muted-foreground mt-2">
              {!currentOrg ? t('selectOrgMsg') : t('trackAndManageBugs')}
            </p>
          </div>
          <Button disabled variant="destructive">
            <Plus className="h-4 w-4 mr-2" />
            {t('reportBug')}
          </Button>
        </div>

        {!currentOrg ? (
          <Card className="text-center py-12">
            <CardContent>
              <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
                <Bug className="h-10 w-10 text-destructive" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{t('noOrgSelected')}</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                {t('selectOrgMsg')}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <LoadingState
              icon={<Bug className="h-8 w-8" />}
              title={t('loading')}
              description={t('trackAndManageBugs')}
            />
            <LoadingGrid count={6} columns={3} />
          </>
        )}
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-8 animate-fade-in">
      {/* Enhanced Header */}
      <div className="mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-border/50">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="space-y-1">
            <h1 className="flex items-center gap-2">
              <div className="p-1.5 sm:p-2 bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg">
                <Bug className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <span className="text-xl sm:text-2xl lg:text-3xl font-bold">{t('bugReports')}</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {t('trackAndManageBugs')} {currentOrg.name}
            </p>
          </div>
          
          <Button onClick={() => {
            setEditingBug(null);
            setFormDialogOpen(true);
          }} variant="destructive" size="sm" className="shadow-lg hover:shadow-xl transition-all w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            <span className="text-sm">{t('reportBug')}</span>
          </Button>
        </div>
      </div>

      <FilterPanel
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder={t('search') + ' ' + t('bugReports').toLowerCase() + '...'}
        filters={[
          { key: 'severity', label: t('severity'), options: filterOptions.severity, type: 'select' },
          { key: 'status', label: t('status'), options: filterOptions.status, type: 'select' },
          { key: 'tags', label: t('tags'), options: filterOptions.tags, type: 'select' },
        ]}
        activeFilters={{ severity: severityFilter, status: statusFilter, tags: tagFilter }}
        onFilterChange={(key, value) => {
          if (key === 'severity') setSeverityFilter(value as string);
          if (key === 'status') setStatusFilter(value as string);
          if (key === 'tags') setTagFilter(value as string);
        }}
        quickFilters={[
          {
            label: t('myReports'),
            onClick: () => {
              // Filter logic could be added here
            },
            active: false
          },
          {
            label: t('criticalAndHigh'),
            onClick: () => {
              setSeverityFilter('high')
            },
            active: severityFilter === 'high' || severityFilter === 'critical'
          },
          {
            label: t('recent'),
            onClick: () => {
              // Sort by recent could be added
            },
            active: false
          }
        ]}
        collapsible={true}
        defaultExpanded={false}
      />

      <BugFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        bug={editingBug}
        onSuccess={handleFormSuccess}
      />

      <BugDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        bug={selectedBug}
        onEdit={handleDetailEdit}
        onDelete={fetchBugs}
      />

      {filteredBugs.length === 0 ? (
        <Card className="text-center py-12 animate-fade-in glass">
          <CardContent>
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="h-10 w-10 text-destructive animate-bounce" />
            </div>
            <h3 className="text-xl font-semibold mb-3">
              {searchTerm || statusFilter !== 'all' || severityFilter !== 'all' || tagFilter !== 'all'
                ? t('noBugsMatchFilter')
                : t('noBugsYet')
              }
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {searchTerm || statusFilter !== 'all' || severityFilter !== 'all' || tagFilter !== 'all'
                ? t('adjustFilters')
                : t('getStartedBugMsg')
              }
            </p>
            <Button 
              onClick={() => {
                setEditingBug(null);
                setFormDialogOpen(true);
              }} 
              variant="destructive"
              size="lg"
              className="animate-bounce-in"
            >
              <Plus className="h-5 w-5 mr-2" />
              {searchTerm || statusFilter !== 'all' || severityFilter !== 'all' || tagFilter !== 'all'
                ? t('reportBug')
                : t('reportFirstBug')
              }
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
          {filteredBugs.map((bug, index) => {
            const quickActions = bug.reporter_id === user?.id && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditBug(bug);
                }}
                className="h-7 w-7 p-0 hover:bg-primary/10"
              >
                <Edit className="h-3.5 w-3.5" />
              </Button>
            );

            const votePanel = (
              <VotePanel
                targetId={bug.id}
                targetType="bug"
                variant="compact"
              />
            );

            return (
              <EnhancedCard
                key={bug.id}
                priority={bug.severity}
                quickActions={quickActions}
                votePanel={votePanel}
                animationDelay={index * 30}
                onClick={() => handleCardClick(bug)}
                topBadge={
                  <Badge 
                    variant={getSeverityColor(bug.severity)}
                    className="text-[10px] px-1.5 py-0.5 font-medium shadow-sm"
                  >
                    {bug.severity === 'critical' && <Zap className="h-2.5 w-2.5 mr-0.5" />}
                    {bug.severity === 'high' && <Star className="h-2.5 w-2.5 mr-0.5" />}
                    {bug.severity === 'medium' && <Clock className="h-2.5 w-2.5 mr-0.5" />}
                    {bug.severity}
                  </Badge>
                }
              >
                <CardHeader
                  title={bug.title}
                  subtitle={bug.description || undefined}
                  icon={<Bug className="h-4 w-4 text-destructive" />}
                  author={bug.profiles?.display_name || bug.profiles?.email || 'Unknown'}
                  date={new Date(bug.created_at).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                />

                {/* Compact Metadata Row */}
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground/70 mb-2">
                  {bug.tags && Array.isArray(bug.tags) && bug.tags.length > 0 && (
                    <span className="flex items-center gap-0.5">
                      <span className="font-medium">{bug.tags.length}</span> tags
                    </span>
                  )}

                  {bug.youtube_url && (
                    <span className="flex items-center gap-0.5">
                      <ExternalLink className="h-2.5 w-2.5" />
                      video
                    </span>
                  )}
                </div>
              </EnhancedCard>
            );
          })}
        </div>
      )}
    </div>
  );
}