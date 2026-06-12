import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Lock, User, Briefcase, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signupSchema = loginSchema.extend({
  fullName: z.string().min(2, "Name must be at least 2 characters").max(100, "Name is too long"),
  userType: z.enum(["buyers_agent", "real_estate_agent", "conveyancer", "mortgage_broker"], {
    required_error: "Please select your professional type",
  }),
});

const userTypeLabels = {
  buyers_agent: "Buyers Agent",
  real_estate_agent: "Real Estate Agent",
  conveyancer: "Conveyancer",
  mortgage_broker: "Mortgage Broker",
};

export default function Auth() {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode");
  const pendingPlan = searchParams.get("plan");
  const pendingBilling = searchParams.get("billing");

  const [isLogin, setIsLogin] = useState(mode !== "signup");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [userType, setUserType] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const { user, signIn, signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Update isLogin when URL params change
  useEffect(() => {
    if (mode === "signup") {
      setIsLogin(false);
    } else if (mode === "signin") {
      setIsLogin(true);
    }
  }, [mode]);

  useEffect(() => {
    if (user) {
      // If there's a pending subscription, redirect to pricing page
      if (pendingPlan) {
        navigate("/pricing");
      } else {
        navigate("/");
      }
    }
  }, [user, navigate, pendingPlan]);

  const validateForm = () => {
    setErrors({});
    try {
      if (isLogin) {
        loginSchema.parse({ email, password });
      } else {
        signupSchema.parse({ email, password, fullName, userType });
      }
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          toast({
            variant: "destructive",
            title: "Login Failed",
            description: error.message === "Invalid login credentials"
              ? "Invalid email or password. Please try again."
              : error.message,
          });
        } else {
          toast({
            title: "Welcome back!",
            description: "You have successfully logged in.",
          });
        }
      } else {
        const { error } = await signUp(email, password, fullName, userType);
        if (error) {
          if (error.message.includes("already registered")) {
            toast({
              variant: "destructive",
              title: "Account Exists",
              description: "An account with this email already exists. Please log in instead.",
            });
          } else {
            toast({
              variant: "destructive",
              title: "Sign Up Failed",
              description: error.message,
            });
          }
        } else {
          toast({
            title: "Account Created!",
            description: pendingPlan
              ? "Redirecting you to complete your subscription..."
              : "Welcome to Buyers Agent Hub. Your professional network awaits.",
          });
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        toast({
          variant: "destructive",
          title: "Google Sign-In Failed",
          description: error.message,
        });
        setIsLoading(false);
      }
      // Don't set loading to false on success - page will redirect
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
      });
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !email.includes('@')) {
      setErrors({ email: 'Please enter a valid email address' });
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message,
        });
      } else {
        setResetEmailSent(true);
        toast({
          title: "Check your email",
          description: "We've sent you a password reset link.",
        });
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const inputClasses = (hasError: boolean) =>
    `h-12 min-h-[44px] rounded-lg bg-white px-4 text-[#1C1917] placeholder:text-[#1C1917]/40 border shadow-[0_2px_10px_rgba(94,70,55,0.05)] transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[#B76E79]/30 focus-visible:ring-offset-0 focus-visible:border-[#B76E79]/50 ${
      hasError ? "border-[#BE123C]" : "border-[rgba(216,195,184,0.6)]"
    }`;

  const labelClasses = "flex items-center gap-2 text-sm font-medium text-[#1C1917]";

  return (
    <div className="flex min-h-screen flex-col bg-[#F6F1EA] lg:flex-row">
      {/* Left panel — atmospheric forest green with aurora light */}
      <div className="relative flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[#173A31] to-[#2D6350] px-8 py-10 lg:min-h-screen lg:w-1/2 lg:py-0">
        {/* Aurora — champagne and rose gold light sources */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 80% at 90% -5%, rgba(183,110,121,0.5), transparent 60%), radial-gradient(ellipse 50% 55% at 70% 10%, rgba(216,195,184,0.4), transparent 65%), radial-gradient(ellipse 60% 70% at 0% 110%, rgba(216,195,184,0.25), transparent 60%)",
          }}
        />
        {/* Subtle texture — fine diagonal sheen */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(135deg, rgba(255,255,255,0.6) 0px, rgba(255,255,255,0.6) 1px, transparent 1px, transparent 9px)",
          }}
        />

        <div className="relative flex flex-col items-center text-center">
          <h2 className="font-serif text-2xl uppercase leading-snug tracking-[0.35em] text-[#D8C3B8] lg:text-4xl lg:leading-relaxed">
            Buyers Agent
            <br />
            Hub
          </h2>
          <div className="mt-5 h-[2px] w-16 rounded-full bg-[#B76E79]" />
          <p className="mt-6 hidden max-w-sm font-serif text-xl leading-relaxed text-white lg:block">
            Where property professionals connect.
          </p>
        </div>
      </div>

      {/* Right panel — warm ivory form */}
      <div className="flex flex-1 items-center justify-center px-6 py-12 lg:w-1/2 lg:px-12">
        <div className="w-full max-w-md">
          <div className="mb-9 text-center lg:text-left">
            <h1 className="font-serif text-4xl font-semibold tracking-tight text-[#173A31] lg:text-5xl">
              {showForgotPassword
                ? "Reset Password"
                : isLogin
                ? "Welcome Back"
                : "Welcome"}
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#1C1917]/70">
              {showForgotPassword
                ? "Enter your email to receive a password reset link"
                : isLogin
                ? "Sign in to access your professional network"
                : pendingPlan
                ? `Create an account to subscribe to ${pendingPlan.charAt(0).toUpperCase() + pendingPlan.slice(1)}`
                : "Create your account to connect with buyers agents"}
            </p>
          </div>
          <div>
            {showForgotPassword ? (
              // Forgot Password Form
              <div className="space-y-4">
                {resetEmailSent ? (
                  // Success state
                  <div className="text-center py-4">
                    <div className="w-16 h-16 bg-[#2D6350]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Mail className="h-8 w-8 text-[#2D6350]" />
                    </div>
                    <h3 className="text-lg font-medium text-[#1C1917] mb-2">Check your email</h3>
                    <p className="text-sm text-[#1C1917]/70 mb-4">
                      We've sent a password reset link to <strong className="text-[#1C1917]">{email}</strong>
                    </p>
                    <p className="text-xs text-[#1C1917]/70">
                      Didn't receive the email? Check your spam folder or{" "}
                      <button
                        type="button"
                        onClick={() => setResetEmailSent(false)}
                        className="text-[#8F4E58] font-medium hover:underline"
                      >
                        try again
                      </button>
                    </p>
                  </div>
                ) : (
                  // Email input form
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="resetEmail" className={labelClasses}>
                        <Mail size={14} className="text-[#2D6350]" />
                        Email Address
                      </Label>
                      <Input
                        id="resetEmail"
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={inputClasses(!!errors.email)}
                      />
                      {errors.email && (
                        <p className="text-xs text-[#BE123C]">{errors.email}</p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      className="w-full min-h-[48px] rounded-lg bg-[#2D6350] py-3.5 text-sm font-semibold tracking-[0.05em] text-white shadow-[0_5px_16px_rgba(23,58,49,0.25)] transition-all duration-200 hover:bg-[#B76E79] hover:shadow-[0_8px_22px_rgba(183,110,121,0.35)]"
                      disabled={isLoading}
                    >
                      {isLoading ? "Sending..." : "Send Reset Link"}
                    </Button>
                  </form>
                )}

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setResetEmailSent(false);
                      setErrors({});
                    }}
                    className="text-sm text-[#1C1917]/70 hover:text-[#2D6350] inline-flex items-center gap-1 min-h-[44px]"
                  >
                    <ArrowLeft size={14} />
                    Back to sign in
                  </button>
                </div>
              </div>
            ) : (
            // Login/Signup Form
            <>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className={labelClasses}>
                      <User size={14} className="text-[#2D6350]" />
                      Full Name
                    </Label>
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="Enter your full name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className={inputClasses(!!errors.fullName)}
                    />
                    {errors.fullName && (
                      <p className="text-xs text-[#BE123C]">{errors.fullName}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="userType" className={labelClasses}>
                      <Briefcase size={14} className="text-[#2D6350]" />
                      Professional Type
                    </Label>
                    <Select value={userType} onValueChange={setUserType}>
                      <SelectTrigger className={inputClasses(!!errors.userType)}>
                        <SelectValue placeholder="Select your profession" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-[rgba(216,195,184,0.6)] text-[#1C1917]">
                        {Object.entries(userTypeLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.userType && (
                      <p className="text-xs text-[#BE123C]">{errors.userType}</p>
                    )}
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className={labelClasses}>
                  <Mail size={14} className="text-[#2D6350]" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClasses(!!errors.email)}
                />
                {errors.email && (
                  <p className="text-xs text-[#BE123C]">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className={labelClasses}>
                  <Lock size={14} className="text-[#2D6350]" />
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClasses(!!errors.password)}
                />
                {errors.password && (
                  <p className="text-xs text-[#BE123C]">{errors.password}</p>
                )}
                {isLogin && (
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotPassword(true);
                        setErrors({});
                        setResetEmailSent(false);
                      }}
                      className="text-xs text-[#7A655A] hover:text-[#8F4E58] hover:underline py-2"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}
              </div>

              <Button
                type="submit"
                className="w-full min-h-[48px] rounded-lg bg-[#2D6350] py-3.5 text-sm font-semibold tracking-[0.05em] text-white shadow-[0_5px_16px_rgba(23,58,49,0.25)] transition-all duration-200 hover:bg-[#B76E79] hover:shadow-[0_8px_22px_rgba(183,110,121,0.35)]"
                disabled={isLoading}
              >
                {isLoading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
              </Button>
            </form>

            {/* Divider - only show for login/signup form */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[rgba(216,195,184,0.6)]"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-[0.15em]">
                <span className="bg-[#F6F1EA] px-3 text-[#1C1917]/60">Or continue with</span>
              </div>
            </div>

            {/* Google Sign-In Button */}
            <Button
              type="button"
              variant="outline"
              className="w-full min-h-[48px] rounded-lg border-[rgba(216,195,184,0.7)] bg-white text-sm font-medium text-[#1C1917] shadow-[0_2px_10px_rgba(94,70,55,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#FBF8F3] hover:text-[#1C1917] hover:shadow-[0_6px_18px_rgba(94,70,55,0.1)]"
              disabled={isLoading}
              onClick={handleGoogleSignIn}
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Sign in with Google
            </Button>

            <div className="mt-6 text-center">
              <p className="text-sm text-[#1C1917]/70">
                {isLogin ? "Don't have an account?" : "Already have an account?"}
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setErrors({});
                    // Update URL to reflect current mode
                    const newMode = isLogin ? "signup" : "signin";
                    const params = new URLSearchParams();
                    params.set("mode", newMode);
                    if (pendingPlan) params.set("plan", pendingPlan);
                    if (pendingBilling) params.set("billing", pendingBilling);
                    navigate(`/auth?${params.toString()}`, { replace: true });
                  }}
                  className="ml-1 min-h-[44px] font-medium text-[#8F4E58] hover:underline"
                >
                  {isLogin ? "Sign up" : "Sign in"}
                </button>
              </p>
            </div>
            </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
