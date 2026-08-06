import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { isAxiosError } from "axios";
import { useAuth } from "../../hooks/useAuth";
import { RolePicker } from "../../components/auth/RolePicker";
import { LoadingSpinner } from "../../components/shared/LoadingSpinner";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { getRoleHomePath } from "../../lib/roles";
import type { PlatformRole } from "../../types/users";

interface SelectRoleLocationState {
  returnTo?: string;
}

/**
 * The one-time "are you hiring or looking for work?" step.
 *
 * A provider hands us an identity and nothing else, so an account created
 * this way arrives without the answer the signup form collects. Same
 * RolePicker, same three roles, same destination afterwards — the only new
 * thing is when it is asked. Once answered it is unreachable: the backend
 * refuses a second call, and this page redirects away.
 */
export function SelectRolePage() {
  const { user, isLoading, needsRoleSelection, intendedRole, selectRole } =
    useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const state = (location.state ?? {}) as SelectRoleLocationState;
  const [role, setRole] = useState<PlatformRole | null>(intendedRole);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (isLoading) {
    return (
      <div className="flex min-h-[8rem] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!needsRoleSelection) {
    return <Navigate to={getRoleHomePath(user.role)} replace />;
  }

  const onSubmit = async () => {
    if (!role) {
      setError("Choose how you'll use HireFlow to continue.");
      return;
    }

    try {
      setError(null);
      setIsSaving(true);
      const updated = await selectRole(role);
      // Recruiters land on the same dashboard a password-based recruiter
      // does, which is where the company-profile gate picks them up.
      navigate(state.returnTo ?? getRoleHomePath(updated.role), {
        replace: true,
      });
    } catch (err) {
      if (isAxiosError(err) && !err.response) {
        setError(
          "We can't reach the HireFlow API right now. Check your connection and try again.",
        );
      } else if (isAxiosError(err) && err.response?.status === 409) {
        setError(
          "This account already has a role. Refresh the page to continue.",
        );
      } else {
        setError("We couldn't save that choice. Try again.");
      }
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>One last thing, {user.name.split(" ")[0]}</CardTitle>
        <CardDescription>
          Are you hiring, or looking for work? This sets up your workspace —
          you only answer it once.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <p
            role="alert"
            className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        )}
        <RolePicker value={role} onChange={setRole} />
      </CardContent>
      <CardFooter>
        <Button
          type="button"
          className="w-full"
          disabled={isSaving}
          onClick={() => void onSubmit()}
        >
          {isSaving ? "Setting up..." : "Continue"}
        </Button>
      </CardFooter>
    </Card>
  );
}
