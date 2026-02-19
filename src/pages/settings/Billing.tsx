/**
 * Billing.tsx
 *
 * Subscription management page for existing subscribers.
 * Shows current plan, renewal date, and links to Stripe Customer Portal.
 * For inspectors: payout setup + earnings overview.
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CreditCard,
  Calendar,
  ExternalLink,
  Loader2,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Banknote,
  AlertCircle,
  DollarSign,
  Clock,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  SUBSCRIPTION_TIERS,
  formatPrice,
  isSubscriptionActive,
  getDaysUntilRenewal,
  createPortalSession,
  redirectToCustomerPortal,
  createConnectOnboardingLink,
  redirectToConnectOnboarding,
  createConnectDashboardLink,
  redirectToConnectDashboard,
} from "@/lib/stripe";

// Earnings data types
interface EarningsJob {
  id: string;
  property_address: string;
  agreed_price: number;
  payout_amount: number | null;
  payout_status: string | null;
  payout_completed_at: string | null;
  completed_at: string | null;
}

interface EarningsSummary {
  totalEarned: number;
  pendingPayouts: number;
  pendingCount: number;
  recentJobs: EarningsJob[];
}

export default function Billing() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [managingSubscription, setManagingSubscription] = useState(false);
  const [settingUpPayouts, setSettingUpPayouts] = useState(false);
  const [openingDashboard, setOpeningDashboard] = useState(false);

  // Earnings state (inspectors only)
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null);
  const [loadingEarnings, setLoadingEarnings] = useState(false);

  // Get subscription info from profile
  const currentTier = (profile?.subscription_tier as keyof typeof SUBSCRIPTION_TIERS) || "free";
  const subscriptionStatus = profile?.subscription_status;
  const periodEnd = profile?.subscription_current_period_end;
  const customerId = profile?.stripe_customer_id;

  const isActive = isSubscriptionActive(subscriptionStatus || null);
  const daysRemaining = getDaysUntilRenewal(periodEnd || null);
  const tierData = SUBSCRIPTION_TIERS[currentTier] || SUBSCRIPTION_TIERS.free;

  // Inspector-specific info
  const isInspector = profile?.user_type === "building_inspector";
  const connectAccountId = profile?.stripe_connect_account_id;
  const connectOnboarded = profile?.stripe_connect_onboarding_complete;

  // Fetch inspector earnings
  const fetchEarnings = useCallback(async () => {
    if (!isInspector || !user?.id) return;
    setLoadingEarnings(true);

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
        `${supabaseUrl}/rest/v1/inspection_jobs?assigned_inspector_id=eq.${user.id}&status=eq.completed&select=id,property_address,agreed_price,payout_amount,payout_status,payout_completed_at,completed_at&order=completed_at.desc&limit=10`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch earnings");
      const jobs: EarningsJob[] = await response.json();

      const totalEarned = jobs
        .filter((j) => j.payout_status === "paid")
        .reduce((sum, j) => sum + (j.payout_amount || 0), 0);

      const pendingJobs = jobs.filter((j) => j.payout_status === "pending" || (!j.payout_status && j.agreed_price));
      const pendingPayouts = pendingJobs.reduce(
        (sum, j) => sum + Math.round((j.agreed_price || 0) * 0.9),
        0
      );

      setEarnings({
        totalEarned,
        pendingPayouts,
        pendingCount: pendingJobs.length,
        recentJobs: jobs,
      });
    } catch (error) {
      console.error("Error fetching earnings:", error);
    } finally {
      setLoadingEarnings(false);
    }
  }, [isInspector, user?.id]);

  useEffect(() => {
    fetchEarnings();
  }, [fetchEarnings]);

  const handleManageSubscription = async () => {
    if (!customerId) {
      toast.error("No subscription found", {
        description: "You don't have an active subscription to manage.",
      });
      return;
    }

    setManagingSubscription(true);

    try {
      const { url, error } = await createPortalSession(customerId);
      if (error || !url) {
        throw new Error(error || "Failed to open subscription management");
      }
      redirectToCustomerPortal(url);
    } catch (err) {
      console.error("Portal error:", err);
      toast.error("Failed to open portal", {
        description: err instanceof Error ? err.message : "Please try again",
      });
      setManagingSubscription(false);
    }
  };

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

  const handleManagePayouts = async () => {
    if (!connectAccountId) return;
    setOpeningDashboard(true);

    try {
      const { url, error } = await createConnectDashboardLink(connectAccountId);
      if (error || !url) {
        throw new Error(error || "Failed to open payout dashboard");
      }
      redirectToConnectDashboard(url);
    } catch (err) {
      console.error("Connect dashboard error:", err);
      toast.error("Failed to open payout dashboard", {
        description: err instanceof Error ? err.message : "Please try again",
      });
      setOpeningDashboard(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
    }).format(cents / 100);
  };

  const getStatusBadge = () => {
    if (!subscriptionStatus || subscriptionStatus === "free") {
      return <Badge variant="secondary">Free Plan</Badge>;
    }

    switch (subscriptionStatus) {
      case "active":
        return <Badge className="bg-green-500/10 text-green-600 border-green-200">Active</Badge>;
      case "trialing":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200">Trial</Badge>;
      case "past_due":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-200">Past Due</Badge>;
      case "cancelled":
        return <Badge className="bg-red-500/10 text-red-600 border-red-200">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{subscriptionStatus}</Badge>;
    }
  };

  const getPayoutStatusBadge = (status: string | null) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-500/10 text-green-600 border-green-200">Paid</Badge>;
      case "processing":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200">Processing</Badge>;
      case "pending":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-200">Pending</Badge>;
      case "failed":
        return <Badge className="bg-red-500/10 text-red-600 border-red-200">Failed</Badge>;
      default:
        return <Badge variant="secondary">Awaiting</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6">
        <div className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-serif font-bold text-foreground">Billing & Subscription</h1>
          <p className="text-muted-foreground mt-1">
            Manage your subscription{isInspector ? ", payouts," : ""} and payment details
          </p>
        </div>

        {/* ============================================= */}
        {/* INSPECTOR PAYOUTS SECTION                      */}
        {/* ============================================= */}
        {isInspector && (
          <>
            {/* Payout Setup Card */}
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Banknote className="h-5 w-5 text-forest" />
                    Payouts
                  </CardTitle>
                  {connectOnboarded && (
                    <Badge className="bg-green-500/10 text-green-600 border-green-200">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Connected
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {!connectAccountId ? (
                  /* Not started onboarding - redirect to dedicated setup page */
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
                      <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-amber-800">Connect your bank account</p>
                        <p className="text-sm text-amber-700 mt-1">
                          Set up your payout account to receive payments for completed inspections.
                          You'll receive 90% of the agreed price when your reports are approved.
                        </p>
                      </div>
                    </div>
                    <Button
                      className="w-full bg-forest hover:bg-forest/90 text-white"
                      onClick={() => navigate("/settings/payouts")}
                    >
                      Set Up Payouts
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                ) : !connectOnboarded ? (
                  /* Started but incomplete - redirect to dedicated setup page */
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
                      <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-amber-800">Complete your payout setup</p>
                        <p className="text-sm text-amber-700 mt-1">
                          Your payout account setup is incomplete. Please finish connecting your
                          bank details to receive payments.
                        </p>
                      </div>
                    </div>
                    <Button
                      className="w-full bg-forest hover:bg-forest/90 text-white"
                      onClick={() => navigate("/settings/payouts")}
                    >
                      Continue Setup
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                ) : (
                  /* Fully onboarded */
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Your bank account is connected. Payments are automatically transferred when
                      your inspection reports are approved.
                    </p>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleManagePayouts}
                      disabled={openingDashboard}
                    >
                      {openingDashboard ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Opening Stripe...
                        </>
                      ) : (
                        <>
                          Manage Payouts
                          <ExternalLink className="h-4 w-4 ml-2" />
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      View your payout schedule, update bank details, and access tax forms
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* My Earnings Card */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-forest" />
                  My Earnings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {loadingEarnings ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <Skeleton className="h-20 rounded-lg" />
                      <Skeleton className="h-20 rounded-lg" />
                    </div>
                    <Skeleton className="h-12" />
                    <Skeleton className="h-12" />
                  </div>
                ) : !earnings || earnings.recentJobs.length === 0 ? (
                  <div className="text-center py-6">
                    <DollarSign className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      No earnings yet. Complete your first inspection job to start earning.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <p className="text-xs text-green-700 font-medium mb-1">Total Earned</p>
                        <p className="text-2xl font-bold text-green-800">
                          {formatCurrency(earnings.totalEarned)}
                        </p>
                      </div>
                      <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                        <p className="text-xs text-amber-700 font-medium mb-1">Pending</p>
                        <p className="text-2xl font-bold text-amber-800">
                          {formatCurrency(earnings.pendingPayouts)}
                        </p>
                        {earnings.pendingCount > 0 && (
                          <p className="text-xs text-amber-600 mt-1">
                            {earnings.pendingCount} job{earnings.pendingCount !== 1 ? "s" : ""}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Pending payout warning */}
                    {earnings.pendingCount > 0 && !connectOnboarded && (
                      <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                        <Clock className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-amber-700">
                          Complete your payout setup to receive {formatCurrency(earnings.pendingPayouts)} in pending payments.
                        </p>
                      </div>
                    )}

                    {/* Recent Payouts */}
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-3">
                        Recent Jobs
                      </h4>
                      <div className="space-y-2">
                        {earnings.recentJobs.map((job) => (
                          <div
                            key={job.id}
                            className="flex items-center justify-between p-3 rounded-lg border border-border"
                          >
                            <div className="flex-1 min-w-0 mr-3">
                              <p className="text-sm font-medium truncate">
                                {job.property_address}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(job.payout_completed_at || job.completed_at)}
                              </p>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <span className="text-sm font-semibold">
                                {formatCurrency(job.payout_amount || Math.round((job.agreed_price || 0) * 0.9))}
                              </span>
                              {getPayoutStatusBadge(job.payout_status)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* ============================================= */}
        {/* SUBSCRIPTION SECTION (ALL USERS)               */}
        {/* ============================================= */}

        {/* Current Plan Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Current Plan</CardTitle>
              {getStatusBadge()}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Plan Details */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-forest/10 flex items-center justify-center">
                  {currentTier === "free" ? (
                    <CreditCard className="h-6 w-6 text-forest" />
                  ) : (
                    <Sparkles className="h-6 w-6 text-forest" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{tierData.name}</h3>
                  <p className="text-muted-foreground">
                    {currentTier === "free"
                      ? "Basic access to the platform"
                      : `${formatPrice(tierData.priceMonthly)}/month`}
                  </p>
                </div>
              </div>
              {currentTier !== "free" && (
                <Button variant="outline" onClick={() => navigate("/pricing")}>
                  Change Plan
                </Button>
              )}
            </div>

            {/* Features List */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">
                Your plan includes:
              </h4>
              <ul className="grid gap-2">
                {tierData.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-forest flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            {/* Renewal Info */}
            {isActive && periodEnd && (
              <div className="flex items-center gap-3 p-3 bg-forest/5 rounded-lg">
                <Calendar className="h-5 w-5 text-forest" />
                <div>
                  <p className="text-sm font-medium">
                    Next billing date: {formatDate(periodEnd)}
                  </p>
                  {daysRemaining !== null && (
                    <p className="text-xs text-muted-foreground">
                      {daysRemaining} days remaining in current period
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Upgrade CTA for Free Users */}
            {currentTier === "free" && (
              <div className="pt-4 border-t">
                <Button
                  className="w-full bg-forest hover:bg-forest/90 text-white"
                  onClick={() => navigate("/pricing")}
                >
                  Upgrade to Premium
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Manage Subscription Card */}
        {currentTier !== "free" && customerId && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Manage Subscription</CardTitle>
              <CardDescription>
                Update payment method, view invoices, or cancel your subscription
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleManageSubscription}
                disabled={managingSubscription}
              >
                {managingSubscription ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Opening Stripe...
                  </>
                ) : (
                  <>
                    Open Billing Portal
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground mt-3 text-center">
                You'll be redirected to Stripe to manage your subscription securely
              </p>
            </CardContent>
          </Card>
        )}

        {/* Payment History Note */}
        <Card className="bg-muted/50 border-dashed">
          <CardContent className="py-6">
            <div className="flex items-start gap-3">
              <CreditCard className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <h4 className="font-medium">Payment History & Invoices</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  View your complete payment history and download invoices from the{" "}
                  {customerId ? (
                    <button
                      onClick={handleManageSubscription}
                      className="text-forest hover:underline"
                    >
                      Stripe Billing Portal
                    </button>
                  ) : (
                    "Stripe Billing Portal"
                  )}
                  .
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
