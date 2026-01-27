import { ReactNode, useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission, Permission, UserRole } from '@/lib/permissions';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: UserRole;
  requiredPermission?: Permission;
  fallbackPath?: string;
  showForbidden?: boolean;
}

export function ProtectedRoute({
  children,
  requiredRole,
  requiredPermission,
  fallbackPath = '/auth',
  showForbidden = false,
}: ProtectedRouteProps) {
  const { user, profile, loading, refreshProfile } = useAuth();

  // Only show loading for initial auth check (max 1 second)
  // Don't wait for profile - we'll use cached profile or render without it
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  // Track whether we've already tried refreshing the profile after a permission failure.
  // This prevents infinite refresh loops when access is genuinely denied.
  const [hasAttemptedRefresh, setHasAttemptedRefresh] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    // Give auth check 1 second max
    const timer = setTimeout(() => setInitialCheckDone(true), 1000);
    if (!loading) {
      setInitialCheckDone(true);
      clearTimeout(timer);
    }
    return () => clearTimeout(timer);
  }, [loading]);

  // Brief loading state - max 1 second
  if (!initialCheckDone && loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Redirect to auth if not logged in
  if (!user) {
    return <Navigate to={fallbackPath} replace />;
  }

  // Determine if the current profile passes the access checks
  const roleCheckFailed = requiredRole && profile?.role !== requiredRole && profile?.role !== 'admin';

  let permissionCheckFailed = false;
  if (requiredPermission) {
    const permissionContext = {
      isAuthenticated: !!user,
      role: profile?.role || null,
      approvalStatus: profile?.approval_status || null,
      userId: user?.id || null,
    };
    permissionCheckFailed = !hasPermission(permissionContext, requiredPermission);
  }

  const accessDenied = roleCheckFailed || permissionCheckFailed;

  // If access is denied but we haven't tried refreshing the profile yet,
  // fetch a fresh profile from the database. This handles the case where
  // the admin approved the user while they were already logged in and
  // the cached profile is stale.
  if (accessDenied && !hasAttemptedRefresh && !isRefreshing) {
    console.log('[ProtectedRoute] Access denied with stale profile, refreshing...', {
      requiredRole,
      requiredPermission,
      actualRole: profile?.role,
    });
    setIsRefreshing(true);
    setHasAttemptedRefresh(true);
    refreshProfile().finally(() => setIsRefreshing(false));
  }

  // Show loading while the refresh is in progress
  if (isRefreshing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Checking access...</div>
      </div>
    );
  }

  // After refresh (or without needing one), enforce the access check
  if (accessDenied) {
    if (roleCheckFailed) {
      console.log('Role check failed:', { requiredRole, actualRole: profile?.role, profile });
    }
    if (showForbidden) {
      return <ForbiddenPage />;
    }
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function ForbiddenPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="max-w-md border-border">
        <CardContent className="p-8 text-center space-y-4">
          <div className="flex justify-center">
            <ShieldAlert size={64} className="text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground">Access Denied</h1>
          <p className="text-muted-foreground">
            You don't have permission to access this page. Please contact an administrator if you believe this is an error.
          </p>
          <Button onClick={() => window.history.back()} variant="outline" className="mt-4">
            Go Back
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
