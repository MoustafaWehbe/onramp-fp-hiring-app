import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { LoadingSpinner } from "../components/shared/LoadingSpinner";
import { getRoleHomePath } from "../lib/roles";
import type { PlatformRole } from "../types/users";

interface ProtectedRouteProps {
  /** When set, only these roles may enter; others go to their own home. */
  allowedRoles?: PlatformRole[];
}

/**
 * Guards routes using the frontend auth state (backend session or demo
 * session — role enforcement stays frontend-only until backend roles ship).
 *
 * - Logged out: redirect to /login with returnTo so login can come back here.
 * - Wrong role: redirect to that user's own workspace home.
 */
export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, currentRole, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        state={{ returnTo: location.pathname + location.search }}
        replace
      />
    );
  }

  if (
    allowedRoles &&
    (!currentRole || !allowedRoles.includes(currentRole))
  ) {
    return <Navigate to={getRoleHomePath(currentRole ?? undefined)} replace />;
  }

  return <Outlet />;
}
