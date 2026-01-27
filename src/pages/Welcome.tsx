/**
 * Welcome.tsx
 *
 * Post-subscription welcome and onboarding page.
 * Shown after successful Stripe checkout to celebrate and guide new subscribers.
 */

import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Play,
  ArrowRight,
  CheckCircle2,
  Circle,
  Users,
  FileText,
  Search,
  Sparkles,
  HelpCircle,
  PartyPopper,
  Crown,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { SUBSCRIPTION_TIERS } from "@/lib/stripe";

export default function Welcome() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile, refreshProfile } = useAuth();
  const [showConfetti, setShowConfetti] = useState(false);
  const [refreshingSubscription, setRefreshingSubscription] = useState(false);

  // Get plan from URL params
  const isPostPayment = searchParams.get("success") === "true";
  const planFromUrl = searchParams.get("plan") as keyof typeof SUBSCRIPTION_TIERS | null;
  const planName = planFromUrl
    ? SUBSCRIPTION_TIERS[planFromUrl]?.name || "Premium"
    : profile?.subscription_tier
    ? SUBSCRIPTION_TIERS[profile.subscription_tier as keyof typeof SUBSCRIPTION_TIERS]?.name
    : "Premium";

  const firstName = profile?.full_name?.split(" ")[0] || "there";

  // Show confetti animation on mount for post-payment
  useEffect(() => {
    if (isPostPayment) {
      setShowConfetti(true);
      setRefreshingSubscription(true);
      // Clear URL params after showing
      const timer = setTimeout(() => {
        navigate("/welcome", { replace: true });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isPostPayment, navigate]);

  // Poll for profile updates after checkout (webhook may be delayed)
  useEffect(() => {
    if (!refreshingSubscription) return;

    refreshProfile();
    let attempts = 0;
    const pollId = setInterval(async () => {
      attempts++;
      await refreshProfile();
      if (attempts >= 5) {
        clearInterval(pollId);
        setRefreshingSubscription(false);
      }
    }, 2000);

    return () => clearInterval(pollId);
  }, [refreshingSubscription, refreshProfile]);

  // Profile completion checks
  const hasPhoto = !!profile?.avatar_url;
  const hasBio = !!profile?.bio && profile.bio.length > 10;
  const hasCity = !!profile?.city;
  const hasSpecializations = false; // TODO: Check actual specializations

  const completedSteps = [hasPhoto, hasBio, hasCity, hasSpecializations].filter(Boolean).length;
  const totalSteps = 4;
  const completionPercent = Math.round((completedSteps / totalSteps) * 100);

  const featureCards = [
    {
      icon: Users,
      title: "Browse the Agent Directory",
      description: "Find and connect with buyers agents in your area",
      link: "/directory",
      color: "bg-blue-500/10 text-blue-600",
    },
    {
      icon: FileText,
      title: "Create a Client Brief",
      description: "Track buyer requirements and match properties",
      link: "/briefs",
      color: "bg-purple-500/10 text-purple-600",
    },
    {
      icon: Search,
      title: "Explore Inspection Jobs",
      description: "Find peer inspection opportunities near you",
      link: "/inspections/spotlights",
      color: "bg-amber-500/10 text-amber-600",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-forest/5 via-background to-rose-gold/5">
      {/* Confetti/Celebration Effect */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {/* Simple celebration particles */}
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: "-20px",
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor: ["#064E3B", "#E8B4B8", "#3B82F6", "#F59E0B", "#8B5CF6"][
                    Math.floor(Math.random() * 5)
                  ],
                }}
              />
            </div>
          ))}
        </div>
      )}

      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 space-y-10">
        {/* ===== SECTION 1: CELEBRATION ===== */}
        <div className="text-center space-y-6">
          <div className="flex justify-center gap-4">
            <PartyPopper className="h-10 w-10 text-rose-gold animate-bounce" />
            <Crown className="h-10 w-10 text-forest" />
            <PartyPopper className="h-10 w-10 text-rose-gold animate-bounce" style={{ animationDelay: "0.2s" }} />
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
              Welcome to Buyers Agent Hub, {firstName}!
            </h1>
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="h-5 w-5 text-forest" />
              <p className="text-lg text-forest font-medium">
                Your {planName} subscription is now active
              </p>
              <Sparkles className="h-5 w-5 text-forest" />
            </div>
          </div>

          <p className="text-muted-foreground max-w-2xl mx-auto">
            You've joined Australia's premier network for property professionals.
            Let's get you set up so you can start connecting with other agents.
          </p>
        </div>

        {/* ===== SECTION 2: VIDEO INTRO ===== */}
        <Card className="overflow-hidden border-2 border-forest/20 shadow-lg">
          <CardContent className="p-0">
            <div className="aspect-video bg-gradient-to-br from-forest/10 to-forest/5 flex flex-col items-center justify-center relative">
              {/* Video Placeholder */}
              <div className="text-center space-y-4 p-8">
                <div className="w-20 h-20 rounded-full bg-forest/10 flex items-center justify-center mx-auto border-2 border-forest/20">
                  <Play className="h-10 w-10 text-forest ml-1" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-foreground">
                    Watch: 2-Minute Platform Tour
                  </h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Learn how to get the most out of your membership, connect with agents,
                    and grow your network.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                  <Button className="bg-forest hover:bg-forest/90 text-white">
                    <Play className="h-4 w-4 mr-2" />
                    Watch Video
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => navigate("/settings/profile")}
                  >
                    I'll explore on my own
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>

              {/* Coming Soon Badge */}
              <div className="absolute top-4 right-4">
                <span className="bg-rose-gold/20 text-rose-gold px-3 py-1 rounded-full text-xs font-medium">
                  Video Coming Soon
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ===== SECTION 3: COMPLETE YOUR PROFILE ===== */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">Complete Your Profile</CardTitle>
              <span className="text-sm text-muted-foreground">
                {completionPercent}% complete
              </span>
            </div>
            <p className="text-muted-foreground text-sm">
              Help other agents find you by completing your profile
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Progress Bar */}
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-forest h-2 rounded-full transition-all duration-500"
                style={{ width: `${completionPercent}%` }}
              />
            </div>

            {/* Checklist */}
            <div className="grid gap-3">
              <ProfileCheckItem
                completed={hasPhoto}
                label="Add your photo"
                description="A professional photo helps build trust"
              />
              <ProfileCheckItem
                completed={hasBio}
                label="Write your bio"
                description="Tell other agents about your experience"
              />
              <ProfileCheckItem
                completed={hasCity}
                label="Add your service areas"
                description="Show where you operate"
              />
              <ProfileCheckItem
                completed={hasSpecializations}
                label="Add your specialties"
                description="Highlight what you're great at"
              />
            </div>

            <Button
              size="lg"
              className="w-full bg-forest hover:bg-forest/90 text-white mt-4"
              onClick={() => navigate("/settings/profile")}
            >
              Complete Your Profile
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </CardContent>
        </Card>

        {/* ===== SECTION 4: WHAT'S NEXT ===== */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-center">What's Next?</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {featureCards.map((feature) => (
              <Card
                key={feature.title}
                className="hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => navigate(feature.link)}
              >
                <CardContent className="pt-6 text-center space-y-3">
                  <div
                    className={`w-12 h-12 rounded-full ${feature.color} flex items-center justify-center mx-auto group-hover:scale-110 transition-transform`}
                  >
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-semibold">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                  <Button variant="ghost" size="sm" className="text-forest">
                    Explore
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* ===== SECTION 5: NEED HELP ===== */}
        <Card className="bg-muted/50 border-dashed">
          <CardContent className="py-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-forest/10 flex items-center justify-center">
                  <HelpCircle className="h-5 w-5 text-forest" />
                </div>
                <div>
                  <h3 className="font-medium">Need Help Getting Started?</h3>
                  <p className="text-sm text-muted-foreground">
                    We're here to help you succeed
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  View FAQs
                </Button>
                <Button variant="outline" size="sm">
                  Contact Support
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Skip to Dashboard */}
        <div className="text-center">
          <Button
            variant="link"
            className="text-muted-foreground"
            onClick={() => navigate("/")}
          >
            Skip to Dashboard
          </Button>
        </div>
      </div>

      {/* CSS for confetti animation */}
      <style>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(-20px) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti-fall 3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

// Profile checklist item component
function ProfileCheckItem({
  completed,
  label,
  description,
}: {
  completed: boolean;
  label: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
      {completed ? (
        <CheckCircle2 className="h-5 w-5 text-forest flex-shrink-0 mt-0.5" />
      ) : (
        <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
      )}
      <div>
        <p className={`font-medium ${completed ? "text-forest" : ""}`}>{label}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
