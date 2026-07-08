import { useUnits } from "@/contexts/UnitsContext";
import { cn } from "@/lib/utils";
import { Ruler } from "lucide-react";

interface UnitToggleProps {
  className?: string;
  compact?: boolean;
}

export function UnitToggle({ className, compact = false }: UnitToggleProps) {
  const { unitSystem, toggleUnitSystem } = useUnits();

  return (
    <button
      onClick={toggleUnitSystem}
      className={cn(
        "flex min-h-[44px] items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200",
        "text-white/70 hover:bg-white/10 hover:text-white",
        className
      )}
      aria-label={`Switch to ${unitSystem === 'metric' ? 'imperial' : 'metric'} units`}
    >
      <Ruler size={16} />
      {!compact && (
        <span className="font-medium">
          {unitSystem === 'metric' ? 'km / m²' : 'mi / ft²'}
        </span>
      )}
      {/* Active unit reads in Warm Ivory — the Brand Kit small-text colour on dark green */}
      <div className="ml-auto flex items-center gap-1 text-xs bg-white/[0.06] px-2 py-0.5 rounded">
        <span className={cn(unitSystem === 'metric' && 'font-semibold text-[#F6F1EA]')}>
          Metric
        </span>
        <span>/</span>
        <span className={cn(unitSystem === 'imperial' && 'font-semibold text-[#F6F1EA]')}>
          Imperial
        </span>
      </div>
    </button>
  );
}
