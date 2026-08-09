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
import { RolePicker, roleIcons } from "../../components/auth/RolePicker";
import {
  getRoleHomePath,
  isPlatformRole,
  resolveRole,
  roleConfig,
} from "../../lib/roles";
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

  const onSubmit = async (data: LoginFormData) => {
    try {
      setError(null);
      if (role) {
        setIntendedRole(role);
      }
      const user = await login(data.email, data.password);
      const resolvedRole = resolveRole(user.role, role ?? intendedRole);
      navigate(state.returnTo ?? getRoleHomePath(resolvedRole), {
        replace: true,
      });
    } catch (err) {
      if (isAxiosError(err) && !err.response) {
        setError(
          "We can't reach the HireFlow API right now. Check that the backend is running and try again.",
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
             className="rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400"
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

        </CardFooter>
      </form>
    </Card>
  );
}
