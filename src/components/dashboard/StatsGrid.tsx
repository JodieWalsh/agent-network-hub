import { Building2, ClipboardCheck, MessageSquare, Star } from "lucide-react";

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  trend?: { value: number; isPositive: boolean };
}

function StatCard({ icon: Icon, label, value, trend }: StatCardProps) {
  return (
    <div className="rounded-[20px] border border-[#2D6350]/10 bg-white/80 p-6 shadow-[0_4px_18px_rgba(94,70,55,0.08)] backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(94,70,55,0.12)]">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#B76E79]/12">
          <Icon size={16} className="text-[#B76E79]" />
        </div>
        {trend && (
          <span className="text-xs font-medium tabular-nums text-[#2D6350]">
            {trend.isPositive ? "+" : ""}
            {trend.value}%
          </span>
        )}
      </div>
      <div>
        <p className="text-3xl font-semibold tabular-nums text-[#2D6350]">{value}</p>
        <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[#1C1917]">{label}</p>
      </div>
    </div>
  );
}

const stats = [
  {
    icon: ClipboardCheck,
    label: "Inspections Active",
    value: 4,
    trend: { value: 2, isPositive: true },
  },
  {
    icon: Building2,
    label: "Properties Listed",
    value: 12,
    trend: { value: 8, isPositive: true },
  },
  {
    icon: MessageSquare,
    label: "Messages",
    value: 7,
  },
  {
    icon: Star,
    label: "Rating",
    value: "4.9",
  },
];

export function StatsGrid() {
  return (
    <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
      {stats.map((stat) => (
        <StatCard key={stat.label} {...stat} />
      ))}
    </div>
  );
}
