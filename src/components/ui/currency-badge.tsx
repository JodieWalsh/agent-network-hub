import { cn } from "@/lib/utils";
import { useUnits } from "@/contexts/UnitsContext";
import { formatWithConversion, CurrencyCode } from "@/lib/currency";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CurrencyBadgeProps {
  amountCents: number;
  currency: CurrencyCode;
  className?: string;
  showConversion?: boolean;
}

export function CurrencyBadge({
  amountCents,
  currency,
  className,
  showConversion = true,
}: CurrencyBadgeProps) {
  const { userCurrency } = useUnits();
  const { primary, estimate } = formatWithConversion(
    amountCents,
    currency,
    userCurrency
  );

  if (!showConversion || !estimate) {
    return (
      <span className={cn("font-semibold text-foreground", className)}>
        {primary}
      </span>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("inline-flex items-center gap-1.5", className)}>
            <span className="font-semibold text-foreground">{primary}</span>
            <Badge
              variant="outline"
              className="text-xs bg-muted/50 text-muted-foreground border-border/50"
            >
              {estimate}
            </Badge>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Approximate conversion based on current rates</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
