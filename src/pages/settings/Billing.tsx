/**
 * Billing.tsx
 *
 * Subscription management page for existing subscribers.
 * Shows current plan, renewal date, and links to Stripe Customer Portal.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  Calendar,
  ExternalLink,
  Loader2,
  CheckCircle2,
  Sparkles,
  ArrowRight,
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
} from "@/lib/stripe";

export default function Billing() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [managingSubscription, setManagingSubscription] = useState(false);

  // Get subscription info from profile
  const currentTier = (profile?.subscription_tier as keyof typeof SUBSCRIPTION_TIERS) || "free";
  const subscriptionStatus = profile?.subscription_status;
  const periodEnd = profile?.subscription_current_period_end;
  const customerId = profile?.stripe_customer_id;

  const isActive = isSubscriptionActive(subscriptionStatus || null);
  const daysRemaining = getDaysUntilRenewal(periodEnd || null);
  const tierData = SUBSCRIPTION_TIERS[currentTier] || SUBSCRIPTION_TIERS.free;

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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
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

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Billing & Subscription</h1>
          <p className="text-muted-foreground mt-1">
            Manage your subscription and payment details
          </p>
        </div>

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
