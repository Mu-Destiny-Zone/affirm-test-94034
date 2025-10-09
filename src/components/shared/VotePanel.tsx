import { useState, useEffect } from 'react';
import { ThumbsUp, ThumbsDown, TrendingUp, TrendingDown, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface VotePanelProps {
  targetType: 'bug' | 'suggestion';
  targetId: string;
  className?: string;
  variant?: 'default' | 'minimal' | 'compact';
}

interface VoterInfo {
  user_id: string;
  vote_type: boolean;
  display_name: string | null;
  email: string | null;
}

export function VotePanel({ targetType, targetId, className, variant = 'default' }: VotePanelProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [votes, setVotes] = useState({ upvotes: 0, downvotes: 0 });
  const [userVote, setUserVote] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [voters, setVoters] = useState<VoterInfo[]>([]);

  useEffect(() => {
    fetchVotes();
  }, [targetId, user]);

  const fetchVotes = async () => {
    try {
      const { data: votesData, error } = await supabase
        .from('votes')
        .select('vote_type, user_id')
        .eq('target_type', targetType)
        .eq('target_id', targetId);

      if (error) {
        console.error('Error fetching votes:', error);
        return;
      }

      const upvotes = votesData?.filter(v => v.vote_type === true).length || 0;
      const downvotes = votesData?.filter(v => v.vote_type === false).length || 0;
      setVotes({ upvotes, downvotes });

      const userIds = Array.from(new Set((votesData || []).map(v => v.user_id)));
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, display_name, email')
          .in('id', userIds);

        if (profilesError) {
          console.error('Error fetching voter profiles:', profilesError);
        }

        const profileMap = new Map((profilesData || []).map((p: any) => [p.id, p]));
        const voterInfo: VoterInfo[] = (votesData || []).map((vote: any) => {
          const profile = profileMap.get(vote.user_id as string) as any;
          return {
            user_id: vote.user_id as string,
            vote_type: vote.vote_type as boolean,
            display_name: profile?.display_name ?? null,
            email: profile?.email ?? null,
          };
        });
        setVoters(voterInfo);
      } else {
        setVoters([]);
      }

      if (user) {
        const userVoteData = votesData?.find(v => v.user_id === user.id);
        setUserVote(userVoteData ? (userVoteData.vote_type as boolean) : null);
      }
    } catch (error) {
      console.error('Error fetching votes:', error);
    }
  };

  const handleVote = async (voteType: boolean) => {
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to vote',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      if (userVote === voteType) {
        // Remove vote if clicking the same vote
        const { error } = await supabase
          .from('votes')
          .delete()
          .eq('user_id', user.id)
          .eq('target_type', targetType)
          .eq('target_id', targetId);

        if (error) throw error;
        setUserVote(null);
      } else {
        // Add or update vote
        const { error } = await supabase
          .from('votes')
          .upsert(
            {
              user_id: user.id,
              target_type: targetType,
              target_id: targetId,
              vote_type: voteType,
            },
            { onConflict: 'user_id,target_type,target_id' }
          );

        if (error) throw error;
        setUserVote(voteType);
      }

      fetchVotes();
    } catch (error) {
      console.error('Error voting:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit vote',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const netScore = votes.upvotes - votes.downvotes;
  const totalVotes = votes.upvotes + votes.downvotes;

  if (variant === 'minimal') {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-7 w-7 p-0 rounded-full hover:scale-105 transition-all",
            userVote === true 
              ? "text-primary bg-primary/10 shadow-sm" 
              : "text-muted-foreground hover:text-primary hover:bg-primary/5"
          )}
          onClick={() => handleVote(true)}
          disabled={loading}
        >
          <ThumbsUp className="h-3 w-3" />
        </Button>
        
        <span className={cn(
          "text-xs font-medium min-w-[2rem] text-center",
          netScore > 0 ? "text-primary" : 
          netScore < 0 ? "text-destructive" : "text-muted-foreground"
        )}>
          {netScore > 0 ? `+${netScore}` : netScore}
        </span>

        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-7 w-7 p-0 rounded-full hover:scale-105 transition-all",
            userVote === false 
              ? "text-destructive bg-destructive/10 shadow-sm" 
              : "text-muted-foreground hover:text-destructive hover:bg-destructive/5"
          )}
          onClick={() => handleVote(false)}
          disabled={loading}
        >
          <ThumbsDown className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={cn("flex flex-col items-center justify-center gap-1 py-2", className)}>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-7 w-7 p-0 rounded-md transition-all hover:scale-110",
            userVote === true 
              ? "text-primary bg-primary/15 shadow-sm" 
              : "text-muted-foreground hover:text-primary hover:bg-primary/10"
          )}
          onClick={(e) => {
            e.stopPropagation();
            handleVote(true);
          }}
          disabled={loading}
        >
          <ThumbsUp className="h-3 w-3" />
        </Button>
        
        <div className={cn(
          "text-xs font-bold min-w-[1.5rem] text-center py-0.5 px-1 rounded",
          netScore > 0 ? "text-primary" : 
          netScore < 0 ? "text-destructive" : "text-muted-foreground"
        )}>
          {netScore > 0 ? `+${netScore}` : netScore}
        </div>

        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-7 w-7 p-0 rounded-md transition-all hover:scale-110",
            userVote === false 
              ? "text-destructive bg-destructive/15 shadow-sm" 
              : "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          )}
          onClick={(e) => {
            e.stopPropagation();
            handleVote(false);
          }}
          disabled={loading}
        >
          <ThumbsDown className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  // Default variant
  return (
    <Card className={cn("p-3", className)}>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-sm text-muted-foreground">Community Vote</h4>
          {totalVotes > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {netScore > 0 ? (
                <TrendingUp className="h-3 w-3 text-primary" />
              ) : netScore < 0 ? (
                <TrendingDown className="h-3 w-3 text-destructive" />
              ) : null}
              {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-4">
          <div className="flex flex-col items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-10 w-10 rounded-full transition-all hover:scale-110",
                userVote === true 
                  ? "text-primary bg-primary/10 border-2 border-primary/20 shadow-lg" 
                  : "text-muted-foreground hover:text-primary hover:bg-primary/5 border-2 border-transparent hover:border-primary/10"
              )}
              onClick={() => handleVote(true)}
              disabled={loading}
            >
              <ThumbsUp className="h-4 w-4" />
            </Button>
            <div className="text-center">
              <div className="text-base font-bold text-primary">{votes.upvotes}</div>
              <div className="text-xs text-muted-foreground">
                {targetType === 'bug' ? 'Helpful' : 'Like'}
              </div>
            </div>
          </div>

          <div className="text-center">
            <div className={cn(
              "text-xl font-bold",
              netScore > 0 ? "text-primary" : 
              netScore < 0 ? "text-destructive" : "text-muted-foreground"
            )}>
              {netScore > 0 ? `+${netScore}` : netScore}
            </div>
            <div className="text-xs text-muted-foreground">Net Score</div>
          </div>

          <div className="flex flex-col items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-10 w-10 rounded-full transition-all hover:scale-110",
                userVote === false 
                  ? "text-destructive bg-destructive/10 border-2 border-destructive/20 shadow-lg" 
                  : "text-muted-foreground hover:text-destructive hover:bg-destructive/5 border-2 border-transparent hover:border-destructive/10"
              )}
              onClick={() => handleVote(false)}
              disabled={loading}
            >
              <ThumbsDown className="h-4 w-4" />
            </Button>
            <div className="text-center">
              <div className="text-base font-bold text-destructive">{votes.downvotes}</div>
              <div className="text-xs text-muted-foreground">
                {targetType === 'bug' ? 'Not Helpful' : 'Dislike'}
              </div>
            </div>
          </div>
        </div>

        {totalVotes === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-1">
            Be the first to vote on this {targetType}!
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-3 w-3" />
              <span>Recent voters</span>
            </div>
            
            {voters.filter(v => v.vote_type === true).length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <ThumbsUp className="h-3 w-3 text-primary" />
                  <span className="text-xs text-primary font-medium">
                    {targetType === 'bug' ? 'Found Helpful' : 'Liked'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {voters.filter(v => v.vote_type === true).slice(0, 6).map((voter, index) => (
                    <div key={voter.user_id} className="flex items-center gap-1">
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {(voter.display_name || voter.email || 'U').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-muted-foreground">
                        {voter.display_name || voter.email?.split('@')[0] || 'User'}
                      </span>
                      {index < voters.filter(v => v.vote_type === true).slice(0, 6).length - 1 && (
                        <span className="text-muted-foreground">,</span>
                      )}
                    </div>
                  ))}
                  {voters.filter(v => v.vote_type === true).length > 6 && (
                    <span className="text-xs text-muted-foreground">
                      +{voters.filter(v => v.vote_type === true).length - 6} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {voters.filter(v => v.vote_type === false).length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <ThumbsDown className="h-3 w-3 text-destructive" />
                  <span className="text-xs text-destructive font-medium">
                    {targetType === 'bug' ? 'Not Helpful' : 'Disliked'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {voters.filter(v => v.vote_type === false).slice(0, 6).map((voter, index) => (
                    <div key={voter.user_id} className="flex items-center gap-1">
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-xs bg-destructive/10 text-destructive">
                          {(voter.display_name || voter.email || 'U').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-muted-foreground">
                        {voter.display_name || voter.email?.split('@')[0] || 'User'}
                      </span>
                      {index < voters.filter(v => v.vote_type === false).slice(0, 6).length - 1 && (
                        <span className="text-muted-foreground">,</span>
                      )}
                    </div>
                  ))}
                  {voters.filter(v => v.vote_type === false).length > 6 && (
                    <span className="text-xs text-muted-foreground">
                      +{voters.filter(v => v.vote_type === false).length - 6} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}