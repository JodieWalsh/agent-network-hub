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
        "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200",
        "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
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
      <div className="ml-auto flex items-center gap-1 text-xs bg-sidebar-accent/50 px-2 py-0.5 rounded">
        <span className={cn(unitSystem === 'metric' && 'font-semibold text-rose-gold')}>
          Metric
        </span>
        <span>/</span>
        <span className={cn(unitSystem === 'imperial' && 'font-semibold text-rose-gold')}>
          Imperial
        </span>
      </div>
    </button>
  );
}
