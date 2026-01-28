/**
 * PayoutSetup.tsx
 *
 * Dedicated payout setup page for inspectors.
 * Focused experience for Stripe Connect onboarding.
 * Shows job context when arriving from a payout_setup_required notification.
 */

import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Banknote,
  ExternalLink,
  Loader2,
  CheckCircle2,
  MapPin,
  DollarSign,
  Shield,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  createConnectOnboardingLink,
  redirectToConnectOnboarding,
} from "@/lib/stripe";

interface PendingJob {
  id: string;
  property_address: string;
  agreed_price: number | null;
  budget_amount: number;
  status: string;
}

export default function PayoutSetup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile } = useAuth();
  const [settingUpPayouts, setSettingUpPayouts] = useState(false);
  const [pendingJobs, setPendingJobs] = useState<PendingJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);

  const jobIdParam = searchParams.get("job");
  const isOnboarded = profile?.stripe_connect_onboarding_complete;

  // Fetch pending_inspector_setup jobs for this inspector
  useEffect(() => {
    if (!user?.id) return;

    const fetchPendingJobs = async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        let accessToken = supabaseKey;
        try {
          const storageKey = `sb-${import.meta.env.VITE_SUPABASE_PROJECT_ID}-auth-token`;
          const stored = localStorage.getItem(storageKey);
          if (stored) accessToken = JSON.parse(stored)?.access_token || supabaseKey;
        } catch (_) {}

        const response = await fetch(
          `${supabaseUrl}/rest/v1/inspection_jobs?assigned_inspector_id=eq.${user.id}&status=eq.pending_inspector_setup&select=id,property_address,agreed_price,budget_amount,status&order=created_at.desc`,
          {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (response.ok) {
          const jobs: PendingJob[] = await response.json();
          setPendingJobs(jobs);
        }
      } catch (error) {
        console.error("Error fetching pending jobs:", error);
      } finally {
        setLoadingJobs(false);
      }
    };

    fetchPendingJobs();
  }, [user?.id]);

  const handleSetupPayouts = async () => {
    if (!user?.id) return;
    setSettingUpPayouts(true);

    try {
      const { url, error } = await createConnectOnboardingLink(user.id);
      if (error || !url) {
        throw new Error(error || "Failed to create onboarding link");
      }
      redirectToConnectOnboarding(url);
    } catch (err) {
      console.error("Connect onboarding error:", err);
      toast.error("Failed to start payout setup", {
        description: err instanceof Error ? err.message : "Please try again",
      });
      setSettingUpPayouts(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // If already onboarded, show success and redirect options
  if (isOnboarded) {
    return (
      <DashboardLayout>
        <div className="max-w-lg mx-auto py-16 px-4">
          <Card>
            <CardContent className="pt-8 pb-8">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold">Payouts Already Set Up</h2>
                <p className="text-sm text-muted-foreground">
                  Your bank account is connected. Payments are automatically
                  transferred when your inspection reports are approved.
                </p>
                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={() => navigate("/settings/billing")}
                    variant="outline"
                  >
                    View Earnings
                  </Button>
                  <Button
                    onClick={() => navigate("/inspections/my-work")}
                    className="bg-forest hover:bg-forest/90 text-white"
                  >
                    My Inspection Work
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // Find the specific job from URL param (if any)
  const highlightedJob = jobIdParam
    ? pendingJobs.find((j) => j.id === jobIdParam)
    : null;

  return (
    <DashboardLayout>
      <div className="max-w-lg mx-auto py-10 px-4">
        {/* Main Setup Card */}
        <Card className="border-amber-200 bg-gradient-to-b from-amber-50/50 to-white">
          <CardContent className="pt-8 pb-8">
            <div className="flex flex-col items-center text-center space-y-5">
              {/* Icon */}
              <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
                <Banknote className="h-8 w-8 text-amber-600" />
              </div>

              {/* Headline */}
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  Set Up Your Payout Account
                </h1>
                <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                  Connect your bank account so payments are sent directly to you
                  when job posters approve your inspection reports.
                </p>
              </div>

              {/* Job Context - Highlighted Job */}
              {highlightedJob && (
                <div className="w-full p-4 bg-white border border-amber-200 rounded-lg text-left">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">
                      Bid Accepted
                    </Badge>
                  </div>
                  <div className="flex items-start gap-2 mb-2">
                    <MapPin className="h-4 w-4 text-forest mt-0.5 flex-shrink-0" />
                    <p className="text-sm font-medium">
                      {highlightedJob.property_address}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-700 font-medium">
                      You'll earn{" "}
                      {formatCurrency(
                        Math.round(
                          (highlightedJob.agreed_price ||
                            highlightedJob.budget_amount) * 0.9
                        )
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      (after 10% platform fee)
                    </span>
                  </div>
                  <p className="text-xs text-amber-700 mt-2">
                    Complete setup below to get officially assigned to this job.
                  </p>
                </div>
              )}

              {/* Other Pending Jobs (if not shown above) */}
              {!loadingJobs &&
                pendingJobs.length > 0 &&
                !highlightedJob && (
                  <div className="w-full p-4 bg-white border border-amber-200 rounded-lg text-left">
                    <p className="text-sm font-medium text-amber-800 mb-2">
                      {pendingJobs.length} job{pendingJobs.length !== 1 ? "s" : ""}{" "}
                      waiting for your setup:
                    </p>
                    <div className="space-y-2">
                      {pendingJobs.slice(0, 3).map((job) => (
                        <div
                          key={job.id}
                          className="flex items-start gap-2"
                        >
                          <MapPin className="h-3.5 w-3.5 text-forest mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm">{job.property_address}</p>
                            <p className="text-xs text-green-600">
                              Earn{" "}
                              {formatCurrency(
                                Math.round(
                                  (job.agreed_price || job.budget_amount) * 0.9
                                )
                              )}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Additional pending jobs when highlighted job shown */}
              {highlightedJob &&
                pendingJobs.length > 1 && (
                  <p className="text-xs text-muted-foreground">
                    + {pendingJobs.length - 1} other job
                    {pendingJobs.length - 1 !== 1 ? "s" : ""} also waiting for
                    your setup
                  </p>
                )}

              {/* How it works */}
              <div className="w-full p-4 bg-muted/50 rounded-lg text-left space-y-3">
                <p className="text-sm font-medium text-foreground">
                  How it works:
                </p>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-forest/10 text-forest text-xs flex items-center justify-center font-medium">
                      1
                    </span>
                    <span>
                      Click below to securely connect your bank account via
                      Stripe
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-forest/10 text-forest text-xs flex items-center justify-center font-medium">
                      2
                    </span>
                    <span>
                      Complete the verification (takes a few minutes)
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-forest/10 text-forest text-xs flex items-center justify-center font-medium">
                      3
                    </span>
                    <span>
                      You'll be automatically assigned to your pending jobs
                    </span>
                  </div>
                </div>
              </div>

              {/* CTA Button */}
              <Button
                className="w-full bg-forest hover:bg-forest/90 text-white h-12 text-base"
                onClick={handleSetupPayouts}
                disabled={settingUpPayouts}
                size="lg"
              >
                {settingUpPayouts ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Redirecting to Stripe...
                  </>
                ) : (
                  <>
                    Connect with Stripe
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>

              {/* Security note */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Shield className="h-3.5 w-3.5" />
                <span>
                  Secure setup powered by Stripe. We never see your bank details.
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Back link */}
        <div className="text-center mt-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/inspections/my-work")}
            className="text-sm text-muted-foreground"
          >
            Back to My Inspection Work
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
