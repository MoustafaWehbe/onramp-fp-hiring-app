import { useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import { z } from "zod";
import { useAuth } from "../../hooks/useAuth";
import { GoogleAuthButton } from "../../components/auth/GoogleAuthButton";
import { RolePicker, roleIcons } from "../../components/auth/RolePicker";
import {
  getRoleHomePath,
  isPlatformRole,
  resolveRole,
  roleConfig,
} from "../../lib/roles";
import { demoCredentials } from "../../data/users";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import type { PlatformRole } from "../../types/users";

const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginLocationState {
  returnTo?: string;
  registered?: boolean;
  email?: string;
}

export function Login() {
  const { login, intendedRole, setIntendedRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const state = (location.state ?? {}) as LoginLocationState;
  const roleParam = searchParams.get("role");
  const [role, setRole] = useState<PlatformRole | null>(() =>
    isPlatformRole(roleParam) ? roleParam : intendedRole,
  );
  const [isSwitchingRole, setIsSwitchingRole] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: state.email ?? "" },
  });

  function chooseRole(nextRole: PlatformRole): void {
    setRole(nextRole);
    setIntendedRole(nextRole);
    setIsSwitchingRole(false);
    setSearchParams({ role: nextRole }, { replace: true });
  }

  function fillDemoAccount(demoRole: PlatformRole): void {
    setValue("email", demoCredentials[demoRole].email, {
      shouldValidate: true,
    });
    setValue("password", demoCredentials[demoRole].password, {
      shouldValidate: true,
    });
    chooseRole(demoRole);
  }

  const onSubmit = async (data: LoginFormData) => {
    try {
      setError(null);
      if (role) {
        setIntendedRole(role);
      }
      const user = await login(data.email, data.password);
      // Backend users carry canonical roles now; the intendedRole fallback
      // only kicks in for the temporary demo session.
      const resolvedRole = resolveRole(user.role, role ?? intendedRole);
      navigate(state.returnTo ?? getRoleHomePath(resolvedRole), {
        replace: true,
      });
    } catch (err) {
      if (isAxiosError(err) && !err.response) {
        setError(
          "We can't reach the HireFlow API right now. If the backend isn't running, use a demo account below to preview the app.",
        );
      } else {
        setError("Invalid email or password.");
      }
    }
  };

  const RoleIcon = role ? roleIcons[role] : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {role
            ? `Welcome back to your ${roleConfig[role].label} workspace`
            : "Sign in to HireFlow"}
        </CardTitle>
        <CardDescription>
          Continue to your saved roles, applications, and interviews.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <CardContent className="space-y-4">
          {state.registered && !error && (
            <p
              role="status"
              className="rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700"
            >
              Account created — sign in to continue.
            </p>
          )}
          {error && (
            <p
              role="alert"
              className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          )}

          {isSwitchingRole ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Sign in as</p>
              <RolePicker value={role} onChange={chooseRole} />
            </div>
          ) : (
            role && (
              <div className="flex items-center gap-3 rounded-md border bg-muted/40 p-3">
                {RoleIcon && (
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-background text-primary"
                    aria-hidden="true"
                  >
                    <RoleIcon className="h-4 w-4" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">
                    {roleConfig[role].label} workspace
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {roleConfig[role].tagline}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsSwitchingRole(true)}
                >
                  Change
                </Button>
              </div>
            )
          )}

          <GoogleAuthButton action="signin" intendedRole={role} />

          <div className="flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              or with email
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="Password"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-xs text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign in"}
          </Button>
          <p className="text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link
              to={role ? `/register?role=${role}` : "/register"}
              className="text-primary hover:underline"
            >
              Create one
            </Link>
          </p>

          {/* TEMPORARY: frontend-only demo accounts for UX testing until
              backend candidate/recruiter/interviewer roles exist. */}
          <div className="w-full rounded-md border border-dashed bg-muted/30 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Demo accounts — frontend preview only
            </p>
            <div className="mt-2 grid gap-1.5">
              {(Object.keys(demoCredentials) as PlatformRole[]).map(
                (demoRole) => (
                  <button
                    key={demoRole}
                    type="button"
                    onClick={() => fillDemoAccount(demoRole)}
                    className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="truncate">
                      {demoCredentials[demoRole].email}
                    </span>
                    <span className="shrink-0 font-medium text-primary">
                      Fill as {roleConfig[demoRole].label.toLowerCase()}
                    </span>
                  </button>
                ),
              )}
            </div>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
