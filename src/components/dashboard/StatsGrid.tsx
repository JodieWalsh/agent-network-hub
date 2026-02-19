import { Star, Target, Users, Gavel } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  trend?: { value: number; isPositive: boolean };
}

function StatCard({ icon: Icon, label, value, trend }: StatCardProps) {
  return (
    <div className="p-5 rounded-lg border border-border bg-white shadow-subtle hover:shadow-card transition-all duration-200">
      <div className="flex items-center justify-between mb-3">
        <div className="w-8 h-8 rounded-lg bg-rose-gold/10 flex items-center justify-center">
          <Icon size={15} className="text-rose-gold" />
        </div>
        {trend && (
          <span className="text-xs text-muted-foreground">
            {trend.isPositive ? "+" : ""}
            {trend.value}%
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-serif font-semibold text-foreground">
          {value}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  );
}

const stats = [
  {
    icon: Star,
    label: "Reputation Score",
    value: 87,
    trend: { value: 3, isPositive: true },
  },
  {
    icon: Target,
    label: "Points Earned",
    value: 245,
    trend: { value: 12, isPositive: true },
  },
  {
    icon: Users,
    label: "Active Connections",
    value: 34,
    trend: { value: 5, isPositive: true },
  },
  {
    icon: Gavel,
    label: "Pending Bids",
    value: 3,
  },
];

export function StatsGrid() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat) => (
        <StatCard key={stat.label} {...stat} />
      ))}
    </div>
  );
}
