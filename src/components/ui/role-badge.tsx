import { Shield, UserCheck, Clock, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { UserRole } from '@/lib/permissions';

interface RoleBadgeProps {
  role: UserRole;
  className?: string;
  showIcon?: boolean;
}

const roleConfig: Record<
  UserRole,
  {
    label: string;
    icon: React.ElementType;
    className: string;
  }
> = {
  admin: {
    label: 'Administrator',
    icon: Shield,
    className: 'bg-purple-100 text-purple-700 border-purple-300',
  },
  verified_professional: {
    label: 'Verified Professional',
    icon: UserCheck,
    className: 'bg-green-100 text-green-700 border-green-300',
  },
  pending_professional: {
    label: 'Pending Professional',
    icon: Clock,
    className: 'bg-amber-100 text-amber-700 border-amber-300',
  },
  guest: {
    label: 'Guest',
    icon: User,
    className: 'bg-gray-100 text-gray-700 border-gray-300',
  },
};

export function RoleBadge({ role, className, showIcon = true }: RoleBadgeProps) {
  const config = roleConfig[role];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn('flex items-center gap-1.5 font-medium', config.className, className)}
    >
      {showIcon && <Icon size={14} />}
      <span>{config.label}</span>
    </Badge>
  );
}
