import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, Plus, Edit, User, Sparkles, Flame, Target } from 'lucide-react';
import { SuggestionFormDialog } from '@/components/forms/SuggestionFormDialog';
import { SuggestionDetailDialog } from '@/components/suggestions/SuggestionDetailDialog';
import { EnhancedCard, CardHeader } from '@/components/ui/enhanced-card';
import { FilterPanel } from '@/components/ui/filter-panel';
import { LoadingGrid, LoadingState } from '@/components/ui/enhanced-loading';
import { VotePanel } from '@/components/shared/VotePanel';

interface SuggestionWithDetails {
  id: string;
  title: string;
  description: string | null;
  status: 'new' | 'consider' | 'planned' | 'done' | 'rejected';
  impact: 'low' | 'medium' | 'high';
  tags: string[] | null;
  created_at: string;
  updated_at: string;
  author_id: string;
  project_id: string;
  org_id: string;
  test_id: string | null;
  profiles?: {
    id: string;
    display_name: string | null;
    email: string;
  };
  projects?: {
    id: string;
    name: string;
  };
  tests?: {
    id: string;
    title: string;
  };
}

export function Suggestions() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { currentOrg } = useOrganization();
  const { toast } = useToast();
  
  const [suggestions, setSuggestions] = useState<SuggestionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingSuggestion, setEditingSuggestion] = useState<SuggestionWithDetails | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [impactFilter, setImpactFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [showMyAssigned, setShowMyAssigned] = useState(false);
  const [showMyReports, setShowMyReports] = useState(false);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<SuggestionWithDetails | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  useEffect(() => {
    if (user && currentOrg) {
      fetchSuggestions();
    }
  }, [user, currentOrg]);

  useEffect(() => {
    const tags = suggestions.reduce((acc: string[], suggestion) => {
      if (suggestion.tags && Array.isArray(suggestion.tags)) {
        suggestion.tags.forEach((tag: string) => {
          if (tag && !acc.includes(tag)) {
            acc.push(tag);
          }
        });
      }
      return acc;
    }, []);
    setAllTags(tags.sort());
  }, [suggestions]);

  const fetchSuggestions = async () => {
    if (!currentOrg) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('suggestions')
        .select(`
          *,
          profiles!suggestions_author_id_fkey(id, display_name, email),
          assignee:profiles!suggestions_assignee_id_fkey(id, display_name, email),
          projects(id, name),
          tests(id, title)
        `)
        .eq('org_id', currentOrg.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching suggestions:', error);
        toast({
          title: "Error",
          description: "Failed to load suggestions",
          variant: "destructive"
        });
      } else {
        setSuggestions(data || []);
      }
    } catch (error) {
      console.error('Error in fetchSuggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditSuggestion = (suggestion: SuggestionWithDetails) => {
    setEditingSuggestion(suggestion);
    setFormDialogOpen(true);
  };

  const handleFormSuccess = () => {
    setEditingSuggestion(null);
    fetchSuggestions();
  };

  const handleCardClick = (suggestion: SuggestionWithDetails) => {
    setSelectedSuggestion(suggestion);
    setDetailDialogOpen(true);
  };

  const handleDetailEdit = (suggestion: SuggestionWithDetails) => {
    setEditingSuggestion(suggestion);
    setFormDialogOpen(true);
    setDetailDialogOpen(false);
  };

  const filteredSuggestions = suggestions.filter(suggestion => {
    const matchesSearch = suggestion.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         suggestion.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || suggestion.status === statusFilter;
    const matchesImpact = impactFilter === 'all' || suggestion.impact === impactFilter;
    const matchesTag = tagFilter === 'all' || (suggestion.tags && Array.isArray(suggestion.tags) && suggestion.tags.includes(tagFilter));
    const matchesAssigned = !showMyAssigned || (suggestion as any).assignee_id === user?.id;
    const matchesReporter = !showMyReports || suggestion.author_id === user?.id;
    
    return matchesSearch && matchesStatus && matchesImpact && matchesTag && matchesAssigned && matchesReporter;
  });

  // Enhanced filter options with counts
  const filterOptions = {
    impact: [
      { value: 'low', label: t('lowImpact'), count: suggestions.filter(s => s.impact === 'low').length },
      { value: 'medium', label: t('mediumImpact'), count: suggestions.filter(s => s.impact === 'medium').length },
      { value: 'high', label: t('highImpact'), count: suggestions.filter(s => s.impact === 'high').length },
    ],
    status: [
      { value: 'new', label: t('new'), count: suggestions.filter(s => s.status === 'new').length },
      { value: 'consider', label: t('consider'), count: suggestions.filter(s => s.status === 'consider').length },
      { value: 'planned', label: t('planned'), count: suggestions.filter(s => s.status === 'planned').length },
      { value: 'done', label: t('done'), count: suggestions.filter(s => s.status === 'done').length },
      { value: 'rejected', label: t('rejected'), count: suggestions.filter(s => s.status === 'rejected').length },
    ],
    tags: allTags.map(tag => ({
      value: tag,
      label: tag,
      count: suggestions.filter(s => s.tags && Array.isArray(s.tags) && s.tags.includes(tag)).length
    }))
  };

  const quickFilters = [
    {
      label: t('myAssigned'),
      onClick: () => {
        setShowMyAssigned(!showMyAssigned);
        setShowMyReports(false); // Clear the other filter
      },
      active: showMyAssigned
    },
    {
      label: t('mySuggestions'),
      onClick: () => {
        setShowMyReports(!showMyReports);
        setShowMyAssigned(false); // Clear the other filter
      },
      active: showMyReports
    }
  ];

  if (loading || !currentOrg) {
    return (
      <div className="container mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Lightbulb className="h-8 w-8 text-primary" />
              {t('suggestions')}
            </h1>
            <p className="text-muted-foreground mt-2">
              {!currentOrg ? t('selectOrgMsg') : t('shareAndDiscuss')}
            </p>
          </div>
          <Button disabled>
            <Plus className="h-4 w-4 mr-2" />
            {t('addSuggestion')}
          </Button>
        </div>

        {!currentOrg ? (
          <Card className="text-center py-12">
            <CardContent>
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Lightbulb className="h-10 w-10 text-primary" />
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
              icon={<Lightbulb className="h-8 w-8" />}
              title={t('loading')}
              description={t('shareAndDiscuss')}
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
              <div className="p-1.5 sm:p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg">
                <Lightbulb className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <span className="text-xl sm:text-2xl lg:text-3xl font-bold">{t('suggestions')}</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {t('shareAndDiscuss')} {currentOrg.name}
            </p>
          </div>

          <Button onClick={() => {
            setEditingSuggestion(null);
            setFormDialogOpen(true);
          }} size="sm" className="btn-gradient shadow-lg w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            <span className="text-sm">{t('addSuggestion')}</span>
          </Button>
        </div>
      </div>

      {/* Enhanced Filters Card */}
      <FilterPanel
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder={t('search') + ' ' + t('suggestions').toLowerCase() + '...'}
        filters={[
          { key: 'impact', label: t('impact'), options: filterOptions.impact, type: 'select' },
          { key: 'status', label: t('status'), options: filterOptions.status, type: 'select' },
          { key: 'tags', label: t('tags'), options: filterOptions.tags, type: 'select' },
        ]}
        activeFilters={{ impact: impactFilter, status: statusFilter, tags: tagFilter }}
        onFilterChange={(key, value) => {
          if (key === 'impact') setImpactFilter(value as string);
          if (key === 'status') setStatusFilter(value as string);
          if (key === 'tags') setTagFilter(value as string);
        }}
        quickFilters={quickFilters}
        collapsible={true}
        defaultExpanded={true}
      />

      <SuggestionFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        suggestion={editingSuggestion}
        onSuccess={handleFormSuccess}
      />

      <SuggestionDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        suggestion={selectedSuggestion}
        onEdit={handleDetailEdit}
        onStatusChange={fetchSuggestions}
        onDelete={fetchSuggestions}
      />

      {/* Suggestions List */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
        {filteredSuggestions.length === 0 ? (
          <div className="col-span-full">
            <Card className="text-center py-12 animate-fade-in glass">
              <CardContent>
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <Lightbulb className="h-10 w-10 text-primary animate-bounce" />
                </div>
                <h3 className="text-xl font-semibold mb-3">
                  {searchTerm || statusFilter !== 'all' || impactFilter !== 'all' || tagFilter !== 'all'
                    ? t('noSuggestionsMatchFilter')
                    : t('noSuggestionsYet')
                  }
                </h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  {searchTerm || statusFilter !== 'all' || impactFilter !== 'all' || tagFilter !== 'all'
                    ? t('adjustFilters')
                    : t('shareImprovementIdea')
                  }
                </p>
                <Button 
                  onClick={() => {
                    setEditingSuggestion(null);
                    setFormDialogOpen(true);
                  }}
                  size="lg"
                  className="animate-bounce-in"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  {searchTerm || statusFilter !== 'all' || impactFilter !== 'all' || tagFilter !== 'all'
                    ? t('addSuggestion')
                    : t('shareFirstIdea')
                  }
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          filteredSuggestions.map((suggestion, index) => {
              const quickActions = suggestion.author_id === user?.id && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditSuggestion(suggestion);
                  }}
                  className="h-7 w-7 p-0 hover:bg-primary/10"
                >
                  <Edit className="h-3.5 w-3.5" />
                </Button>
              );

              const getImpactIcon = () => {
                switch (suggestion.impact) {
                  case 'high': return <Flame className="h-2.5 w-2.5 mr-0.5" />
                  case 'medium': return <Target className="h-2.5 w-2.5 mr-0.5" />
                  case 'low': return <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                  default: return null
                }
              };

              const votePanel = (
                <VotePanel
                  targetId={suggestion.id}
                  targetType="suggestion"
                  variant="compact"
                />
              );

              return (
                <EnhancedCard
                  key={suggestion.id}
                  priority={suggestion.impact}
                  quickActions={quickActions}
                  votePanel={votePanel}
                  animationDelay={index * 30}
                  onClick={() => handleCardClick(suggestion)}
                  topBadge={
                    <Badge 
                      variant={
                        suggestion.impact === 'high' ? 'destructive' :
                        suggestion.impact === 'medium' ? 'default' : 'secondary'
                      }
                      className="text-[10px] px-1.5 py-0.5 font-medium shadow-sm"
                    >
                        {getImpactIcon()}
                        {suggestion.impact}
                    </Badge>
                  }
                >
                  <CardHeader
                    title={suggestion.title}
                    subtitle={suggestion.description || undefined}
                    icon={<Lightbulb className="h-4 w-4 text-primary" />}
                    author={suggestion.profiles?.display_name || suggestion.profiles?.email || 'Unknown'}
                    date={new Date(suggestion.created_at).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  />

                  {/* Compact Metadata Row */}
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground/70 mb-2">
                    {(suggestion as any).assignee && (
                      <span className="flex items-center gap-0.5" data-testid={`suggestion-assignee-${suggestion.id}`}>
                        <User className="h-2.5 w-2.5" />
                        {(suggestion as any).assignee.display_name || (suggestion as any).assignee.email}
                      </span>
                    )}
                    
                    {suggestion.tags && Array.isArray(suggestion.tags) && suggestion.tags.length > 0 && (
                      <span className="flex items-center gap-0.5">
                        <span className="font-medium">{suggestion.tags.length}</span> tags
                      </span>
                    )}
                    
                    {suggestion.tests && (
                      <span className="flex items-center gap-0.5">
                        <Target className="h-2.5 w-2.5" />
                        test linked
                      </span>
                    )}
                  </div>

                </EnhancedCard>
              );
            })
        )}
      </div>
    </div>
  );
}