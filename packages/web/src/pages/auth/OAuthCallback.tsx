import { useEffect } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { LoadingSpinner } from "../../components/shared/LoadingSpinner";
import { getRoleHomePath, isPlatformRole } from "../../lib/roles";

/**
 * Where the provider round-trip lands.
 *
 * The API has already set the session cookies and bounced the browser here,
 * which reloads the app — so by the time this renders, AuthProvider is
 * fetching /auth/me and will report the real user. This page only decides
 * where they go next, and does it from that fetched user rather than from the
 * query string: the URL is attacker-controllable, the session is not.
 */
export function OAuthCallback() {
  const { user, currentRole, isLoading, needsRoleSelection, setIntendedRole } =
    useAuth();
  const [searchParams] = useSearchParams();

  const roleParam = searchParams.get("role")?.toLowerCase();
  const returnTo = searchParams.get("returnTo");

  // Carry the role the visitor picked before leaving for the provider, so the
  // prompt on the next screen opens on their answer rather than blank.
  useEffect(() => {
    if (isPlatformRole(roleParam)) {
      setIntendedRole(roleParam);
    }
  }, [roleParam, setIntendedRole]);

  if (isLoading) {
    return (
      <div className="flex min-h-[8rem] items-center justify-center">
        <LoadingSpinner />
        <span className="sr-only">Finishing sign-in…</span>
      </div>
    );
  }

  // Cookies did not survive the trip. Nothing useful to say beyond sending
  // them back to a form that works.
  if (!user) {
    return <Navigate to="/login?oauth_error=provider_error" replace />;
  }

  if (needsRoleSelection) {
    return (
      <Navigate
        to="/auth/select-role"
        state={returnTo ? { returnTo } : undefined}
        replace
      />
    );
  }

  return (
    <Navigate
      to={returnTo ?? getRoleHomePath(currentRole ?? user.role)}
      replace
    />
  );
}
