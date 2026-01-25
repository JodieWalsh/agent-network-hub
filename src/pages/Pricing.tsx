import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Check, Sparkles, Shield, Users, Clock, ExternalLink, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  SUBSCRIPTION_TIERS,
  formatPrice,
  isSubscriptionActive,
  getDaysUntilRenewal,
  createCheckoutSession,
  createPortalSession,
  redirectToCheckout,
  redirectToCustomerPortal,
} from "@/lib/stripe";

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
  const { user, profile } = useAuth();
  const [isAnnual, setIsAnnual] = useState(true);
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [managingSubscription, setManagingSubscription] = useState(false);

  // Handle success/cancel URL params
  useEffect(() => {
    const success = searchParams.get("success");
    const canceled = searchParams.get("canceled");

    if (success === "true") {
      toast.success("Welcome aboard!", {
        description: "Your subscription is now active. Thank you for joining!",
      });
      // Clear the URL params
      navigate("/pricing", { replace: true });
    } else if (canceled === "true") {
      toast.info("Checkout canceled", {
        description: "No worries - you can subscribe anytime.",
      });
      navigate("/pricing", { replace: true });
    }
  }, [searchParams, navigate]);

  // Get current subscription info
  const currentTier = profile?.subscription_tier || "free";
  const subscriptionStatus = profile?.subscription_status;
  const periodEnd = profile?.subscription_current_period_end;
  const isActive = isSubscriptionActive(subscriptionStatus || null);
  const daysRemaining = getDaysUntilRenewal(periodEnd || null);

  const handleSelectPlan = async (tier: keyof typeof SUBSCRIPTION_TIERS) => {
    if (!user) {
      toast.error("Please sign in", {
        description: "You need to be signed in to subscribe.",
      });
      navigate("/auth");
      return;
    }

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

    setLoadingTier(tier);

    try {
      const { sessionId, error } = await createCheckoutSession(priceId, user.id);

      if (error || !sessionId) {
        throw new Error(error || "Failed to create checkout session");
      }

      const redirectResult = await redirectToCheckout(sessionId);

      if (redirectResult.error) {
        throw new Error(redirectResult.error);
      }
    } catch (err) {
      console.error("Checkout error:", err);
      toast.error("Checkout failed", {
        description: err instanceof Error ? err.message : "Please try again",
      });
    } finally {
      setLoadingTier(null);
    }
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
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
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
