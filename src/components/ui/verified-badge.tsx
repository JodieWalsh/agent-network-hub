import { Shield, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface VerifiedBadgeProps {
  isVerified: boolean;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-5 w-5",
};

export function VerifiedBadge({
  isVerified,
  size = "md",
  showLabel = false,
  className,
}: VerifiedBadgeProps) {
  if (isVerified) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "inline-flex items-center gap-1 text-rose-gold",
                className
              )}
            >
              <Shield className={cn(sizeClasses[size], "fill-rose-gold/20")} />
              {showLabel && (
                <span className="text-xs font-medium">Verified</span>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Verified Professional</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Unverified users get a subtle "New Member" tag (optional display)
  if (showLabel) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "inline-flex items-center gap-1 text-muted-foreground",
                className
              )}
            >
              <Sparkles className={cn(sizeClasses[size])} />
              <span className="text-xs">New Member</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>New to the network</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return null;
}
