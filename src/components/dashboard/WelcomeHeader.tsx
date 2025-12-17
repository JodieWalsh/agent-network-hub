import { Sparkles } from "lucide-react";

interface WelcomeHeaderProps {
  userName: string;
}

export function WelcomeHeader({ userName }: WelcomeHeaderProps) {
  return (
    <div className="animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-serif font-semibold text-foreground">
            Welcome back, {userName}!
          </h1>
          <p className="mt-1 text-muted-foreground flex items-center gap-2">
            <Sparkles size={16} className="text-rose-gold" />
            Your network is growing.
          </p>
        </div>
        
        {/* Date Badge */}
        <div className="hidden sm:block text-right">
          <p className="text-sm font-medium text-foreground">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </p>
          <p className="text-xs text-muted-foreground">
            {new Date().toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
