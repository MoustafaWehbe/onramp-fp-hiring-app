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
 * Guards routes using the authenticated backend session.
 *
 * - Logged out: redirect to /login with returnTo so login can come back here.
 * - Role not chosen yet: finish the one-time prompt first.
 * - Wrong role: redirect to that user's own workspace home.
 */
export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, currentRole, isLoading, needsRoleSelection } = useAuth();
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

  // An OAuth signup that has not answered the role prompt has no meaningful
  // role yet — `role` is still sitting on its CANDIDATE default. Sending them
  // through here on that placeholder would drop them into the wrong workspace,
  // so the prompt comes first no matter which URL they arrived at.
  if (needsRoleSelection) {
    return (
      <Navigate
        to="/auth/select-role"
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
