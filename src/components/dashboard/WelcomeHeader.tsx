import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface WelcomeHeaderProps {
  userName?: string | null;
  userId?: string | null;
  hasAvatar?: boolean;
}

export function WelcomeHeader({ userName, userId, hasAvatar }: WelcomeHeaderProps) {
  const navigate = useNavigate();
  const [isReturningUser, setIsReturningUser] = useState(true);

  useEffect(() => {
    if (userId) {
      const hasVisitedKey = `user_${userId}_has_visited`;
      const hasVisited = localStorage.getItem(hasVisitedKey);

      if (!hasVisited) {
        // First time user - redirect to welcome video page
        setIsReturningUser(false);
        localStorage.setItem(hasVisitedKey, 'true');

        // Redirect to welcome page for onboarding video
        navigate('/welcome');
      } else {
        setIsReturningUser(true);
      }
    }
  }, [userId, navigate]);

  const getWelcomeMessage = () => {
    if (!userName) {
      return "Welcome to Buyers Agent Hub";
    }
    return isReturningUser ? `Welcome back, ${userName}` : `Welcome, ${userName}`;
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-serif font-semibold text-foreground">
            {getWelcomeMessage()}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
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
