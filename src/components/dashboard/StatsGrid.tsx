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
    <div className="p-6 rounded-[18px] border border-forest/10 bg-cream shadow-card hover:shadow-hover transition-all duration-200">
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 rounded-2xl bg-rose-gold/15 flex items-center justify-center">
          <Icon size={16} className="text-rose-gold-dark" />
        </div>
        {trend && (
          <span className="text-xs text-forest/70 font-medium">
            {trend.isPositive ? "+" : ""}
            {trend.value}%
          </span>
        )}
      </div>
      <div>
        <p className="text-3xl font-serif font-bold text-forest">{value}</p>
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground mt-2">{label}</p>
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
