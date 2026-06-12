import { Building2, ClipboardCheck, MessageSquare, Star } from "lucide-react";

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  trend?: { value: number; isPositive: boolean };
}

function StatCard({ icon: Icon, label, value, trend }: StatCardProps) {
  return (
    <div
      className="rounded-[20px] border border-white/60 p-6 backdrop-blur-md transition-all duration-200 hover:-translate-y-1 shadow-[0_2px_4px_rgba(94,70,55,0.08),0_24px_56px_-8px_rgba(183,110,121,0.3),0_14px_36px_rgba(140,95,70,0.16),0_6px_16px_rgba(94,70,55,0.1)] hover:shadow-[0_4px_8px_rgba(94,70,55,0.1),0_32px_68px_-8px_rgba(183,110,121,0.38),0_18px_44px_rgba(140,95,70,0.2),0_8px_20px_rgba(94,70,55,0.12)]"
      style={{
        background:
          "linear-gradient(150deg, rgba(255,255,255,0.94) 0%, rgba(255,255,255,0.74) 55%, rgba(246,241,234,0.68) 100%)",
        borderTop: "1px solid rgba(183,110,121,0.3)",
      }}
    >
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
