import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Check, Sparkles, Shield, Users, Clock, ExternalLink, Loader2, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  SUBSCRIPTION_TIERS,
  formatPrice,
  isSubscriptionActive,
  getDaysUntilRenewal,
  createCheckoutSession,
  createPortalSession,
  redirectToCustomerPortal,
} from "@/lib/stripe";

// Session storage keys for pending subscription
const PENDING_PLAN_KEY = "pending_subscription_plan";
const PENDING_BILLING_KEY = "pending_subscription_billing";

const faqs = [
  {
    question: "Can I change my plan later?",
    answer: "Yes, you can upgrade or downgrade your plan at any time. When upgrading, you'll be charged the prorated difference. When downgrading, your new rate takes effect at the next billing cycle.",
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept all major credit cards (Visa, Mastercard, American Express) and debit cards. All payments are processed securely through Stripe.",
  },
  {
    question: "Is there a free trial?",
    answer: "We offer a Free tier that lets you explore the platform. When you're ready for more features, you can upgrade to Basic or Premium at any time.",
  },
  {
    question: "Can I cancel anytime?",
    answer: "Absolutely. There are no long-term contracts or cancellation fees. You can cancel your subscription at any time from your account settings.",
  },
  {
    question: "What happens when I cancel?",
    answer: "You'll continue to have access to your paid features until the end of your current billing period. After that, your account will revert to the Free tier.",
  },
  {
    question: "Do you offer refunds?",
    answer: "We offer a 14-day money-back guarantee for new subscribers. If you're not satisfied, contact us within 14 days of your first payment for a full refund.",
  },
];

export default function Pricing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, refreshProfile } = useAuth();
  const [isAnnual, setIsAnnual] = useState(true);
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [managingSubscription, setManagingSubscription] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<string | null>(null);
  const [refreshingSubscription, setRefreshingSubscription] = useState(false);
  const hasTriggeredCheckout = useRef(false);

  // Handle success/cancel URL params
  useEffect(() => {
    const success = searchParams.get("success");
    const canceled = searchParams.get("canceled");

    if (success === "true") {
      // Clear any pending subscription data
      sessionStorage.removeItem(PENDING_PLAN_KEY);
      sessionStorage.removeItem(PENDING_BILLING_KEY);
      toast.success("Welcome aboard!", {
        description: "Your subscription is now active. Thank you for joining!",
      });
      setRefreshingSubscription(true);
      // Clear the URL params
      navigate("/pricing", { replace: true });
    } else if (canceled === "true") {
      toast.info("Checkout canceled", {
        description: "No worries - you can subscribe anytime.",
      });
      navigate("/pricing", { replace: true });
    }
  }, [searchParams, navigate]);

  // Check for pending subscription after sign up
  useEffect(() => {
    const storedPlan = sessionStorage.getItem(PENDING_PLAN_KEY);
    const storedBilling = sessionStorage.getItem(PENDING_BILLING_KEY);

    if (storedPlan) {
      setPendingPlan(storedPlan);
      // Set billing toggle to match what they selected
      if (storedBilling === "monthly") {
        setIsAnnual(false);
      } else {
        setIsAnnual(true);
      }
    }
  }, []);

  // Auto-trigger checkout if user just signed up with a pending plan
  useEffect(() => {
    const storedPlan = sessionStorage.getItem(PENDING_PLAN_KEY);

    if (user && storedPlan && !hasTriggeredCheckout.current) {
      // User is now logged in and has a pending plan - auto-trigger checkout
      hasTriggeredCheckout.current = true;

      // Small delay to ensure UI is rendered
      const timer = setTimeout(() => {
        handleSelectPlan(storedPlan as keyof typeof SUBSCRIPTION_TIERS);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [user]);

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

  // Get current subscription info
  const currentTier = profile?.subscription_tier || "free";
  const subscriptionStatus = profile?.subscription_status;
  const periodEnd = profile?.subscription_current_period_end;
  const isActive = isSubscriptionActive(subscriptionStatus || null);
  const daysRemaining = getDaysUntilRenewal(periodEnd || null);

  const handleSelectPlan = async (tier: keyof typeof SUBSCRIPTION_TIERS) => {
    const selectedTier = SUBSCRIPTION_TIERS[tier];
    const priceId = isAnnual
      ? selectedTier.stripePriceIdAnnual
      : selectedTier.stripePriceIdMonthly;

    if (!priceId) {
      // Free tier - no checkout needed
      toast.info("You're on the Free plan", {
        description: "Enjoy the platform!",
      });
      return;
    }

    if (!user) {
      // Store the selected plan and redirect to sign up
      sessionStorage.setItem(PENDING_PLAN_KEY, tier);
      sessionStorage.setItem(PENDING_BILLING_KEY, isAnnual ? "annual" : "monthly");

      toast.info("Create an account first", {
        description: `Sign up to subscribe to ${selectedTier.name}.`,
      });

      // Redirect to sign up page with plan info in URL
      navigate(`/auth?mode=signup&plan=${tier}&billing=${isAnnual ? "annual" : "monthly"}`);
      return;
    }

    setLoadingTier(tier);

    try {
      const { url, error } = await createCheckoutSession(priceId, user.id);

      if (error || !url) {
        throw new Error(error || "Failed to create checkout session");
      }

      // Clear pending subscription data on successful checkout initiation
      sessionStorage.removeItem(PENDING_PLAN_KEY);
      sessionStorage.removeItem(PENDING_BILLING_KEY);
      setPendingPlan(null);

      // Redirect directly to Stripe Checkout URL
      window.location.href = url;
    } catch (err) {
      console.error("Checkout error:", err);
      toast.error("Checkout failed", {
        description: err instanceof Error ? err.message : "Please try again",
      });
      setLoadingTier(null);
    }
  };

  const handleContinueSubscription = () => {
    if (pendingPlan) {
      handleSelectPlan(pendingPlan as keyof typeof SUBSCRIPTION_TIERS);
    }
  };

  const handleDismissPendingPlan = () => {
    sessionStorage.removeItem(PENDING_PLAN_KEY);
    sessionStorage.removeItem(PENDING_BILLING_KEY);
    setPendingPlan(null);
  };

  const handleManageSubscription = async () => {
    if (!profile?.stripe_customer_id) {
      toast.error("No subscription found", {
        description: "You don't have an active subscription to manage.",
      });
      return;
    }

    setManagingSubscription(true);

    try {
      const { url, error } = await createPortalSession(profile.stripe_customer_id);

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

  const renderPricingCard = (
    tier: keyof typeof SUBSCRIPTION_TIERS,
    isPopular = false
  ) => {
    const tierData = SUBSCRIPTION_TIERS[tier];
    const price = isAnnual ? tierData.priceAnnual : tierData.priceMonthly;
    const monthlyEquivalent = isAnnual ? Math.round(tierData.priceAnnual / 12) : tierData.priceMonthly;
    const isCurrentPlan = currentTier === tier && isActive;
    const isLoading = loadingTier === tier;

    return (
      <Card
        className={`relative flex flex-col ${
          isPopular
            ? "border-forest shadow-lg ring-2 ring-forest/20"
            : "border-border"
        }`}
      >
        {isPopular && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <Badge className="bg-forest text-white px-3 py-1">
              <Sparkles className="w-3 h-3 mr-1" />
              Most Popular
            </Badge>
          </div>
        )}

        {isCurrentPlan && (
          <div className="absolute -top-3 right-4">
            <Badge variant="secondary" className="px-3 py-1">
              Current Plan
            </Badge>
          </div>
        )}

        <CardHeader className="text-center pb-2">
          <CardTitle className="text-xl">{tierData.name}</CardTitle>
          <div className="mt-4">
            <span className="text-4xl font-bold">{formatPrice(monthlyEquivalent)}</span>
            <span className="text-muted-foreground">/month</span>
          </div>
          {isAnnual && price > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              {formatPrice(price)} billed annually
            </p>
          )}
        </CardHeader>

        <CardContent className="flex-1 flex flex-col">
          <ul className="space-y-3 flex-1">
            {tierData.features.map((feature, index) => (
              <li key={index} className="flex items-start gap-3">
                <Check className="w-5 h-5 text-forest flex-shrink-0 mt-0.5" />
                <span className="text-sm">{feature}</span>
              </li>
            ))}
          </ul>

          <div className="mt-6">
            {isCurrentPlan ? (
              <div className="space-y-3">
                {daysRemaining !== null && (
                  <p className="text-sm text-center text-muted-foreground">
                    Renews in {daysRemaining} days
                  </p>
                )}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleManageSubscription}
                  disabled={managingSubscription}
                >
                  {managingSubscription ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Opening...
                    </>
                  ) : (
                    <>
                      Manage Subscription
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <Button
                className={`w-full ${
                  isPopular
                    ? "bg-forest hover:bg-forest/90 text-white"
                    : ""
                }`}
                variant={isPopular ? "default" : "outline"}
                onClick={() => handleSelectPlan(tier)}
                disabled={isLoading || loadingTier !== null}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : tier === "free" ? (
                  "Get Started"
                ) : (
                  "Subscribe"
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-foreground mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Choose the plan that fits your needs. Upgrade or downgrade anytime.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-10">
          <span
            className={`text-sm font-medium ${
              !isAnnual ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            Monthly
          </span>
          <Switch
            checked={isAnnual}
            onCheckedChange={setIsAnnual}
            className="data-[state=checked]:bg-forest"
          />
          <span
            className={`text-sm font-medium ${
              isAnnual ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            Annual
          </span>
          {isAnnual && (
            <Badge variant="secondary" className="bg-forest/10 text-forest">
              Save 17%
            </Badge>
          )}
        </div>

        {/* Pending Subscription Banner */}
        {pendingPlan && user && !loadingTier && (
          <Alert className="mb-8 border-forest/20 bg-forest/5">
            <Sparkles className="h-4 w-4 text-forest" />
            <AlertDescription className="flex items-center justify-between">
              <span>
                You were subscribing to <strong>{SUBSCRIPTION_TIERS[pendingPlan as keyof typeof SUBSCRIPTION_TIERS]?.name}</strong>.
                Ready to continue?
              </span>
              <div className="flex gap-2 ml-4">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDismissPendingPlan}
                >
                  Dismiss
                </Button>
                <Button
                  size="sm"
                  className="bg-forest hover:bg-forest/90 text-white"
                  onClick={handleContinueSubscription}
                >
                  Continue
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {renderPricingCard("free")}
          {renderPricingCard("basic", true)}
          {renderPricingCard("premium")}
        </div>

        {/* Trust Section */}
        <div className="border-t border-border pt-12 mb-16">
          <div className="grid sm:grid-cols-3 gap-8 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-forest/10 flex items-center justify-center">
                <Shield className="w-6 h-6 text-forest" />
              </div>
              <h3 className="font-semibold">Secure Payments</h3>
              <p className="text-sm text-muted-foreground">
                All payments are processed securely through Stripe
              </p>
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-forest/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-forest" />
              </div>
              <h3 className="font-semibold">Trusted by Professionals</h3>
              <p className="text-sm text-muted-foreground">
                Join the growing network of property professionals
              </p>
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-forest/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-forest" />
              </div>
              <h3 className="font-semibold">Cancel Anytime</h3>
              <p className="text-sm text-muted-foreground">
                No long-term contracts or hidden fees
              </p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">
            Frequently Asked Questions
          </h2>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* Contact CTA */}
        <div className="text-center mt-12 pt-8 border-t border-border">
          <p className="text-muted-foreground">
            Have questions? Need a custom plan?{" "}
            <a
              href="mailto:support@buyersagenthub.com"
              className="text-forest hover:underline font-medium"
            >
              Contact us
            </a>
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
