/**
 * ConnectReturn.tsx
 *
 * Stripe redirects here after Connect onboarding.
 * Checks onboarding status and redirects to Billing.
 */

import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  createConnectOnboardingLink,
  redirectToConnectOnboarding,
  checkConnectStatus,
} from "@/lib/stripe";

export default function ConnectReturn() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, refreshProfile } = useAuth();
  const [checking, setChecking] = useState(true);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const isRefresh = searchParams.get("refresh") === "true";
  const isSuccess = searchParams.get("success") === "true";

  useEffect(() => {
    const checkStatus = async () => {
      if (isRefresh) {
        // User needs to restart onboarding
        setChecking(false);
        return;
      }

      // Directly check Stripe account status (bypasses webhook dependency)
      if (user?.id) {
        const result = await checkConnectStatus(user.id);
        if (result.onboarding_complete) {
          // DB was updated by the edge function — refresh profile to pick it up
          await refreshProfile();
          setChecking(false);
          return;
        }
      }

      // Small delay then re-check via profile refresh
      await new Promise((r) => setTimeout(r, 2000));

      if (refreshProfile) {
        await refreshProfile();
      }

      setChecking(false);
    };

    checkStatus();
  }, [isRefresh, user?.id, refreshProfile]);

  // Update onboardingComplete when profile changes
  useEffect(() => {
    if (profile) {
      setOnboardingComplete(!!profile.stripe_connect_onboarding_complete);
    }
  }, [profile]);

  // Auto-redirect on success after 3 seconds
  useEffect(() => {
    if (!checking && onboardingComplete) {
      toast.success("Payout account connected successfully!");
      const timer = setTimeout(() => navigate("/settings/payouts"), 3000);
      return () => clearTimeout(timer);
    }
  }, [checking, onboardingComplete, navigate]);

  const handleRetryOnboarding = async () => {
    if (!user) return;
    setRetrying(true);

    try {
      const { url, error } = await createConnectOnboardingLink(user.id);
      if (error || !url) {
        throw new Error(error || "Failed to create onboarding link");
      }
      redirectToConnectOnboarding(url);
    } catch (err) {
      console.error("Retry onboarding error:", err);
      toast.error("Failed to restart onboarding. Please try again.");
      setRetrying(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-lg mx-auto py-16 px-4">
        <Card>
          <CardContent className="pt-8 pb-8">
            {checking ? (
              <div className="flex flex-col items-center text-center space-y-4">
                <Loader2 className="h-12 w-12 text-forest animate-spin" />
                <h2 className="text-lg font-semibold">Verifying your account...</h2>
                <p className="text-sm text-muted-foreground">
                  Checking your payout setup with Stripe.
                </p>
              </div>
            ) : onboardingComplete ? (
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-lg font-semibold">Payout Account Connected</h2>
                <p className="text-sm text-muted-foreground">
                  Your bank account is set up. You'll receive payments when your
                  inspection reports are approved.
                </p>
                <Button
                  onClick={() => navigate("/settings/payouts")}
                  className="bg-forest hover:bg-forest/90 text-white"
                >
                  View Payout Status
                </Button>
              </div>
            ) : isRefresh ? (
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
                  <AlertCircle className="h-8 w-8 text-amber-600" />
                </div>
                <h2 className="text-lg font-semibold">Setup Incomplete</h2>
                <p className="text-sm text-muted-foreground">
                  Your onboarding session expired or needs to be restarted.
                  Click below to continue setting up your payout account.
                </p>
                <Button
                  onClick={handleRetryOnboarding}
                  disabled={retrying}
                  className="bg-forest hover:bg-forest/90 text-white"
                >
                  {retrying ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Redirecting...
                    </>
                  ) : (
                    "Continue Setup"
                  )}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => navigate("/settings/payouts")}
                  className="text-sm"
                >
                  Back to Payout Setup
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 text-blue-600" />
                </div>
                <h2 className="text-lg font-semibold">Verifying Your Account</h2>
                <p className="text-sm text-muted-foreground">
                  Stripe is still verifying your details. This can take a few
                  moments. You'll see a confirmation on the Billing page once
                  everything is set up.
                </p>
                <Button
                  onClick={() => navigate("/settings/payouts")}
                  className="bg-forest hover:bg-forest/90 text-white"
                >
                  View Payout Status
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
