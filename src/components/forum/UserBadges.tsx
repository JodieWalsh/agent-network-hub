import { useState, useEffect } from 'react';
import { Award, Star, HelpCircle, MessageSquare, Trophy, Crown } from 'lucide-react';
import { ForumExpertBadge, fetchUserBadges } from '@/lib/forum';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface UserBadgesProps {
  userId: string;
  inline?: boolean;
}

const badgeConfig: Record<string, { icon: typeof Award; color: string; label: string }> = {
  helpful_member: { icon: HelpCircle, color: 'text-blue-500', label: 'Helpful Member — 10+ replies' },
  problem_solver: { icon: MessageSquare, color: 'text-green-500', label: 'Problem Solver — 5+ solutions' },
  top_contributor: { icon: Star, color: 'text-amber-500', label: 'Top Contributor — 50+ posts' },
  rising_star: { icon: Trophy, color: 'text-purple-500', label: 'Rising Star — 100+ reputation' },
  expert: { icon: Award, color: 'text-indigo-500', label: 'Expert — 500+ reputation' },
  community_leader: { icon: Crown, color: 'text-yellow-500', label: 'Community Leader — 1000+ reputation' },
};

export function UserBadges({ userId, inline = true }: UserBadgesProps) {
  const [badges, setBadges] = useState<ForumExpertBadge[]>([]);

  useEffect(() => {
    fetchUserBadges(userId).then(setBadges);
  }, [userId]);

  if (badges.length === 0) return null;

  return (
    <TooltipProvider>
      <span className={inline ? 'inline-flex items-center gap-0.5' : 'flex items-center gap-1'}>
        {badges.map((badge) => {
          const config = badgeConfig[badge.badge_type];
          if (!config) return null;
          const Icon = config.icon;

          return (
            <Tooltip key={badge.id}>
              <TooltipTrigger asChild>
                <span className={`${config.color} cursor-default`}>
                  <Icon size={inline ? 14 : 16} />
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{config.label}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </span>
    </TooltipProvider>
  );
}
