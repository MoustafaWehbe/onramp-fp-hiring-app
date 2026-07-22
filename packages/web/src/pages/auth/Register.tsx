import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import { z } from "zod";
import { useAuth } from "../../hooks/useAuth";
import { GoogleAuthButton } from "../../components/auth/GoogleAuthButton";
import { RolePicker, roleIcons } from "../../components/auth/RolePicker";
import { isPlatformRole, roleConfig } from "../../lib/roles";
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

const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain an uppercase letter")
      .regex(/[0-9]/, "Must contain a number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export function Register() {
  const { register: registerUser, intendedRole, setIntendedRole } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const roleParam = searchParams.get("role");
  // Role priority: explicit URL param, then the role picked earlier on the
  // homepage (persisted as intendedRole). Null means "let the user choose".
  const [role, setRole] = useState<PlatformRole | null>(() =>
    isPlatformRole(roleParam) ? roleParam : intendedRole,
  );
  const [rolePreselected, setRolePreselected] = useState(() => role !== null);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  function chooseRole(nextRole: PlatformRole): void {
    setRole(nextRole);
    setIntendedRole(nextRole);
    setSearchParams({ role: nextRole }, { replace: true });
  }

  const onSubmit = async (data: RegisterFormData) => {
    if (!role) {
      setError("Choose how you'll use HireFlow before creating your account.");
      return;
    }

    try {
      setError(null);
      setIntendedRole(role);
      // TODO(backend-roles): the API register endpoint has no role field yet.
      // The chosen role stays in frontend storage and is applied after login.
      await registerUser(data.email, data.password,data.name,role,);
      navigate(`/login?role=${role}`, {
        state: { registered: true, email: data.email },
      });
    } catch (err) {
      if (isAxiosError(err) && !err.response) {
        setError(
          "We can't reach the HireFlow API right now. If the backend isn't running yet, you can explore with a demo account from the sign-in page.",
        );
      } else if (isAxiosError(err) && err.response?.status === 409) {
        setError("An account with that email already exists. Try signing in.");
      } else {
        setError(
          "Registration didn't go through. Check your details and try again — that email may already be in use.",
        );
      }
    }
  };

  const RoleIcon = role ? roleIcons[role] : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {role
            ? `Create your ${roleConfig[role].label} workspace`
            : "Create your account"}
        </CardTitle>
        <CardDescription>
          {role
            ? roleConfig[role].description
            : "Choose how you'll use HireFlow, then set up your account."}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <CardContent className="space-y-4">
          {error && (
            <p
              role="alert"
              className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          )}

          {role && rolePreselected ? (
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
                onClick={() => setRolePreselected(false)}
              >
                Change
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium">I'm joining as</p>
              <RolePicker value={role} onChange={chooseRole} />
            </div>
          )}

          <GoogleAuthButton action="signup" intendedRole={role} />

          <div className="flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              or with email
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              autoComplete="name"
              placeholder="Alice Smith"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
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
              autoComplete="new-password"
              placeholder="At least 8 characters"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-xs text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="Repeat your password"
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <p className="text-xs text-destructive">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Creating account..." : "Create account"}
          </Button>
          <p className="text-center text-xs leading-5 text-muted-foreground">
            By creating an account, you agree to HireFlow's{" "}
            <span className="font-medium text-foreground">
              Terms of Service
            </span>{" "}
            and{" "}
            <span className="font-medium text-foreground">Privacy Policy</span>.
          </p>
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              to={role ? `/login?role=${role}` : "/login"}
              className="text-primary hover:underline"
            >
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
