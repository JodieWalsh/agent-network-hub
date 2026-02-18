import { useState, useEffect } from 'react';
import { BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  ForumPoll,
  getPollForPost,
  getUserPollVotes,
  votePoll,
  formatPostDate,
} from '@/lib/forum';
import { toast } from 'sonner';

interface PollDisplayProps {
  postId: string;
  userId?: string;
}

export function PollDisplay({ postId, userId }: PollDisplayProps) {
  const [poll, setPoll] = useState<ForumPoll | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set());
  const [userVoted, setUserVoted] = useState(false);
  const [voting, setVoting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPoll();
  }, [postId, userId]);

  const loadPoll = async () => {
    setLoading(true);
    const p = await getPollForPost(postId);
    setPoll(p);

    if (p && userId) {
      const votes = await getUserPollVotes(p.id, userId);
      if (votes.length > 0) {
        setSelectedOptions(new Set(votes));
        setUserVoted(true);
      }
    }
    setLoading(false);
  };

  const handleToggleOption = (optionId: string) => {
    if (userVoted || !poll) return;

    setSelectedOptions((prev) => {
      const next = new Set(prev);
      if (poll.allows_multiple) {
        if (next.has(optionId)) next.delete(optionId);
        else next.add(optionId);
      } else {
        next.clear();
        next.add(optionId);
      }
      return next;
    });
  };

  const handleVote = async () => {
    if (!poll || !userId || selectedOptions.size === 0) return;

    setVoting(true);
    const success = await votePoll(poll.id, Array.from(selectedOptions), userId);
    if (success) {
      setUserVoted(true);
      // Reload poll to get updated counts
      const updated = await getPollForPost(postId);
      if (updated) setPoll(updated);
      toast.success('Vote recorded');
    } else {
      toast.error('Failed to vote');
    }
    setVoting(false);
  };

  if (loading || !poll) return null;

  const isEnded = poll.ends_at && new Date(poll.ends_at) < new Date();
  const showResults = userVoted || isEnded || !userId;
  const totalVotes = poll.total_votes;

  return (
    <Card className="border-purple-200 bg-purple-50/30 mb-4">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 size={16} className="text-purple-600" />
          <span className="font-semibold text-sm">{poll.question}</span>
        </div>

        <div className="space-y-2">
          {poll.options.map((option) => {
            const percentage = totalVotes > 0
              ? Math.round((option.vote_count / totalVotes) * 100)
              : 0;
            const isSelected = selectedOptions.has(option.id);

            return (
              <button
                key={option.id}
                onClick={() => handleToggleOption(option.id)}
                disabled={showResults}
                className={cn(
                  'w-full text-left rounded-lg border px-3 py-2 text-sm transition-all relative overflow-hidden',
                  showResults
                    ? 'border-purple-200 cursor-default'
                    : isSelected
                      ? 'border-purple-500 bg-purple-100'
                      : 'border-border hover:border-purple-300 hover:bg-purple-50 cursor-pointer'
                )}
              >
                {showResults && (
                  <div
                    className="absolute inset-0 bg-purple-100/60 transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                )}
                <div className="relative flex items-center justify-between">
                  <span className={cn(isSelected && 'font-medium')}>
                    {option.option_text}
                  </span>
                  {showResults && (
                    <span className="text-xs font-medium text-purple-700 ml-2">
                      {percentage}%
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
          <span>{totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}</span>
          <div className="flex items-center gap-2">
            {isEnded ? (
              <span>Poll ended</span>
            ) : poll.ends_at ? (
              <span>Ends {formatPostDate(poll.ends_at)}</span>
            ) : null}
            {poll.allows_multiple && <span>Multiple choice</span>}
          </div>
        </div>

        {!showResults && userId && (
          <Button
            onClick={handleVote}
            disabled={selectedOptions.size === 0 || voting}
            size="sm"
            className="mt-3 bg-purple-600 hover:bg-purple-700"
          >
            {voting ? 'Voting...' : 'Vote'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
