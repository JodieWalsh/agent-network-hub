/**
 * Welcome.tsx
 *
 * First-time user onboarding page with welcome video
 * Shown to new users before redirecting them to profile setup
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, ArrowRight, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function Welcome() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [videoWatched, setVideoWatched] = useState(false);

  const firstName = profile?.full_name?.split(' ')[0] || 'there';

  const handleContinue = () => {
    navigate('/settings/profile', {
      state: { isFirstTimeSetup: true }
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-forest/5 to-background flex items-center justify-center p-4">
      <div className="max-w-3xl w-full space-y-8">
        {/* Welcome Header */}
        <div className="text-center space-y-4">
          <img
            src="/images/logo/logo-option-1.svg"
            alt="Buyers Agent Hub"
            className="h-16 w-auto mx-auto"
          />
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">
            Welcome to Buyers Agent Hub, {firstName}!
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Before you get started, watch this quick video to learn how to make the most of your professional network.
          </p>
        </div>

        {/* Video Placeholder */}
        <Card className="overflow-hidden border-2 border-forest/20">
          <CardContent className="p-0">
            <div className="aspect-video bg-gradient-to-br from-forest/10 to-forest/5 flex flex-col items-center justify-center">
              {/* Placeholder for video */}
              <div className="text-center space-y-4 p-8">
                <div className="w-24 h-24 rounded-full bg-forest/10 flex items-center justify-center mx-auto">
                  <Play className="h-12 w-12 text-forest" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-foreground">
                    Getting Started Video
                  </h3>
                  <p className="text-muted-foreground max-w-md">
                    Video coming soon! This will explain how to set up your profile,
                    connect with other agents, and use the platform features.
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setVideoWatched(true)}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  I've understood the overview
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* What you'll set up */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-4">Next, you'll set up:</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <div className="w-8 h-8 rounded-full bg-forest/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-forest font-semibold">1</span>
                </div>
                <div>
                  <p className="font-medium">Profile Photo</p>
                  <p className="text-sm text-muted-foreground">Add your professional photo</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <div className="w-8 h-8 rounded-full bg-forest/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-forest font-semibold">2</span>
                </div>
                <div>
                  <p className="font-medium">Service Areas</p>
                  <p className="text-sm text-muted-foreground">Define where you operate</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <div className="w-8 h-8 rounded-full bg-forest/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-forest font-semibold">3</span>
                </div>
                <div>
                  <p className="font-medium">Credentials</p>
                  <p className="text-sm text-muted-foreground">Verify your professional status</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Continue Button */}
        <div className="flex justify-center">
          <Button
            size="lg"
            className="bg-forest hover:bg-forest/90 text-white px-8"
            onClick={handleContinue}
          >
            Continue to Profile Setup
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>

        {/* Skip option */}
        <p className="text-center text-sm text-muted-foreground">
          <button
            onClick={handleContinue}
            className="underline hover:text-foreground"
          >
            Skip video and continue
          </button>
        </p>
      </div>
    </div>
  );
}
