import { useState } from "react";
import { Check, Copy, ExternalLink, Globe } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Button, buttonVariants } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import { cn } from "../../../lib/utils";
import type { CompanyProfile } from "../../../types/company";

/**
 * Surfaces the recruiter's own public careers page, which is otherwise
 * unreachable — nothing in the app linked to /careers/:companyId, so the only
 * way to find it was to know the company UUID.
 *
 * The path is built from the current origin so the copied link works in
 * whichever environment the recruiter is looking at.
 *
 * Takes the profile as a prop rather than calling useCompanyProfile() itself:
 * this component only ever mounts once its caller's own copy of that query
 * has already resolved to a company. A second, independent observer mounting
 * at that exact moment sees a query with no successful data yet and (per
 * React Query's default refetchOnMount) immediately refetches it — which
 * flips the shared query back to pending, unmounts this component again
 * (the caller falls back to its loading state), and repeats forever the
 * instant the retry settles. Sharing the already-fetched data instead of
 * re-querying avoids creating that second observer entirely.
 */
export function CareersPageLink({
  company,
}: {
  company: CompanyProfile | undefined;
}) {
  const [hasCopied, setHasCopied] = useState(false);

  // Nothing to link to until the company exists; the create-company flow is
  // where a recruiter is sent in that case, and it already prompts them.
  if (!company) {
    return null;
  }

  const path = `/careers/${company.id}`;
  const shareUrl = `${window.location.origin}${path}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setHasCopied(true);
      toast.success("Careers page link copied");
      window.setTimeout(() => setHasCopied(false), 2_000);
    } catch {
      // Denied permission, or a browser without the async clipboard API. The
      // URL is on screen and selectable, so this is a downgrade, not a dead end.
      toast.error("Couldn't copy — select the link and copy it manually.");
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Globe className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            Your public careers page
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Share this link. It shows your open roles to anyone, no account
            needed.
          </p>
          <code className="mt-2 block truncate rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
            {shareUrl}
          </code>
        </div>

        <div className="flex shrink-0 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => void copy()}
          >
            {hasCopied ? (
              <Check className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Copy className="h-4 w-4" aria-hidden="true" />
            )}
            {hasCopied ? "Copied" : "Copy link"}
          </Button>
          <Link
            to={path}
            target="_blank"
            rel="noreferrer"
            className={cn(buttonVariants({ size: "sm" }), "gap-2")}
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            View
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
