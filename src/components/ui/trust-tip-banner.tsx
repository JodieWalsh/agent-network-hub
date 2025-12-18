import { Shield, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface TrustTipBannerProps {
  className?: string;
}

export function TrustTipBanner({ className }: TrustTipBannerProps) {
  const [isDismissed, setIsDismissed] = useState(() => {
    return localStorage.getItem("trustTipDismissed") === "true";
  });

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem("trustTipDismissed", "true");
  };

  if (isDismissed) return null;

  return (
    <div
      className={cn(
        "relative bg-gradient-to-r from-rose-gold/20 to-rose-gold/10 border border-rose-gold/30 rounded-lg p-4",
        className
      )}
    >
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
      
      <div className="flex items-start gap-3 pr-6">
        <div className="shrink-0 w-10 h-10 rounded-full bg-rose-gold/20 flex items-center justify-center">
          <Shield className="h-5 w-5 text-rose-gold" />
        </div>
        <div className="space-y-1">
          <h4 className="font-semibold text-foreground text-sm">
            Trust Tip: Get Verified!
          </h4>
          <p className="text-sm text-muted-foreground">
            Verified professionals receive{" "}
            <span className="font-medium text-foreground">40% more responses</span>{" "}
            to their requests. Build trust with your network.
          </p>
          <Button
            variant="link"
            className="h-auto p-0 text-rose-gold hover:text-rose-gold/80 text-sm font-medium"
          >
            Learn how to get verified →
          </Button>
        </div>
      </div>
    </div>
  );
}
