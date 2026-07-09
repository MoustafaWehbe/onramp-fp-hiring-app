import { getGoogleOAuthUrl, isGoogleOAuthEnabled } from "../../lib/oauth";
import { cn } from "../../lib/utils";
import type { PlatformRole } from "../../types/users";

interface GoogleAuthButtonProps {
  /** "Sign in" or "Sign up" wording context. */
  action?: "signin" | "signup";
  intendedRole?: PlatformRole | null;
  className?: string;
}

function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.46a5.53 5.53 0 0 1-2.4 3.62v3h3.88c2.26-2.09 3.58-5.17 3.58-8.81Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3.01c-1.07.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.72-4.95H1.27v3.11A11.99 11.99 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.28A7.2 7.2 0 0 1 4.9 12c0-.79.14-1.56.38-2.28V6.61H1.27a11.99 11.99 0 0 0 0 10.78l4.01-3.11Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44A11.53 11.53 0 0 0 12 0 11.99 11.99 0 0 0 1.27 6.61l4.01 3.11C6.22 6.88 8.87 4.77 12 4.77Z"
      />
    </svg>
  );
}

/**
 * "Continue with Google" — UI only for now.
 *
 * The backend OAuth endpoint is not built yet, so while
 * VITE_ENABLE_GOOGLE_OAUTH is false the button renders disabled with a clear
 * coming-soon note instead of silently failing. Once the backend ships and
 * the flag flips, it redirects to /api/auth/google with the intended role.
 */
export function GoogleAuthButton({
  action = "signin",
  intendedRole,
  className,
}: GoogleAuthButtonProps) {
  const enabled = isGoogleOAuthEnabled();
  const label =
    action === "signup" ? "Sign up with Google" : "Continue with Google";

  return (
    <div className={cn("space-y-1.5", className)}>
      <button
        type="button"
        disabled={!enabled}
        aria-describedby={enabled ? undefined : "google-oauth-note"}
        onClick={() => {
          if (enabled) {
            window.location.assign(getGoogleOAuthUrl(intendedRole));
          }
        }}
        className={cn(
          "inline-flex h-10 w-full items-center justify-center gap-3 rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors",
          "hover:bg-accent hover:text-accent-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-60",
        )}
      >
        <GoogleLogo className="h-4 w-4 shrink-0" />
        {label}
      </button>
      {!enabled && (
        <p
          id="google-oauth-note"
          className="text-center text-xs text-muted-foreground"
        >
          Google sign-in is coming soon — it will be enabled after backend
          setup.
        </p>
      )}
    </div>
  );
}
