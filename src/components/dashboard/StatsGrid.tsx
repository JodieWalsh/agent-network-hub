import { Star, Target, Users, Gavel } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  suffix?: string;
  trend?: { value: number; isPositive: boolean };
  accentColor?: string;
  delay?: string;
}

function StatCard({
  icon: Icon,
  label,
  value,
  suffix,
  trend,
  accentColor = "bg-primary",
  delay = "0",
}: StatCardProps) {
  return (
    <div
      className={cn("stat-card opacity-0 animate-fade-in", delay)}
      style={{ animationDelay: delay }}
    >
      <div className="flex items-start justify-between">
        <div
          className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center",
            accentColor
          )}
        >
          <Icon size={20} className="text-primary-foreground" />
        </div>
        {trend && (
          <span
            className={cn(
              "text-xs font-medium px-2 py-0.5 rounded-full",
              trend.isPositive
                ? "bg-emerald-100 text-emerald-700"
                : "bg-red-100 text-red-700"
            )}
          >
            {trend.isPositive ? "+" : ""}
            {trend.value}%
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-2xl lg:text-3xl font-serif font-semibold text-foreground">
          {value}
          {suffix && (
            <span className="text-lg ml-1 text-muted-foreground">{suffix}</span>
          )}
        </p>
        <p className="text-sm text-muted-foreground mt-1">{label}</p>
      </div>
    </div>
  );
}

const stats = [
  {
    icon: Star,
    label: "Reputation Score",
    value: 87,
    suffix: "⭐",
    trend: { value: 3, isPositive: true },
    accentColor: "bg-rose-gold",
  },
  {
    icon: Target,
    label: "Points Earned",
    value: 245,
    suffix: "🎯",
    trend: { value: 12, isPositive: true },
    accentColor: "bg-burgundy",
  },
  {
    icon: Users,
    label: "Active Connections",
    value: 34,
    trend: { value: 5, isPositive: true },
    accentColor: "bg-forest",
  },
  {
    icon: Gavel,
    label: "Pending Bids",
    value: 3,
    accentColor: "bg-forest-light",
  },
];

export function StatsGrid() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <StatCard
          key={stat.label}
          {...stat}
          delay={`${index * 100}ms`}
        />
      ))}
    </div>
  );
}
