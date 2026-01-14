interface WelcomeHeaderProps {
  userName?: string | null;
}

export function WelcomeHeader({ userName }: WelcomeHeaderProps) {
  return (
    <div className="animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl lg:text-2xl font-sans font-semibold text-foreground">
            {userName ? `Welcome back, ${userName}` : "Welcome to Buyers Agent Hub"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {userName ? "Your network is growing" : "Please sign in to access your dashboard"}
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
