import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../lib/api-client";
import {
  OAUTH_PROVIDERS,
  oauthProviderLabels,
  startOAuth,
} from "../../lib/oauth";
import { providerMarks } from "./ProviderMarks";
import type { OAuthProvider, PlatformRole } from "../../types/users";

/**
 * Provider sign-in buttons for the login and signup forms.
 *
 * Intentionally plain: the design-system pass on feature/design-system-dark-mode
 * restyles every control on these two pages, so anything spent on looks here
 * would be thrown away. What matters is that they are real buttons, keyboard
 * reachable, and carry the visitor's role choice into the redirect.
 */

interface ProvidersResponse {
  data: { providers: OAuthProvider[] };
}

async function fetchEnabledProviders(): Promise<OAuthProvider[]> {
  const { data } = await apiClient.get<ProvidersResponse>("/auth/providers");
  return data.data.providers;
}

interface OAuthButtonsProps {
  /** Role the visitor picked, carried through the provider round-trip. */
  role: PlatformRole | null;
  returnTo?: string | null;
  disabled?: boolean;
}

export function OAuthButtons({ role, returnTo, disabled }: OAuthButtonsProps) {
  const providersQuery = useQuery({
    queryKey: ["auth", "oauth-providers"],
    queryFn: fetchEnabledProviders,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  // While the list is in flight, show nothing rather than buttons that might
  // turn out to be dead. If the lookup fails outright, fall back to showing
  // every provider: an unconfigured one bounces back to /login with a message
  // that says so, which beats silently hiding a working sign-in path.
  if (providersQuery.isLoading) {
    return null;
  }

  const providers = providersQuery.data ?? OAUTH_PROVIDERS;

  if (providers.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {providers.map((provider) => {
        const Mark = providerMarks[provider];

        return (
          <button
            key={provider}
            type="button"
            disabled={disabled}
            onClick={() => startOAuth(provider, { role, returnTo })}
            className="flex w-full items-center justify-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
          >
            <Mark />
            Continue with {oauthProviderLabels[provider]}
          </button>
        );
      })}

      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">
          or continue with email
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}
