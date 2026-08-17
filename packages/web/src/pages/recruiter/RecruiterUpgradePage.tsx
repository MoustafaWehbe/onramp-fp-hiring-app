import { Check, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Skeleton } from "../../components/ui/skeleton";
import {
  useCompanyProfile,
  useUpdateCompanySubscription,
} from "../../features/company/hooks";
import { getApiErrorMessage } from "../../lib/api-errors";
import { cn } from "../../lib/utils";
import {
  ACCENT_GRADIENT,
  ACCENT_TEXT,
  CARD_CLASS,
} from "../../features/candidate/theme";
import type { SubscriptionTier } from "../../types/company";

interface PlanFeature {
  label: string;
  free: boolean;
  pro: boolean;
}

const FEATURES: PlanFeature[] = [
  { label: "Jobs, pipeline, and applications", free: true, pro: true },
  { label: "1 open job at a time", free: true, pro: false },
  { label: "Unlimited open jobs", free: false, pro: true },
  { label: "AI fit scoring for applicants", free: false, pro: true },
  { label: "Talent pool: notes, tags, and invites", free: false, pro: true },
  { label: "Interview scorecards", free: false, pro: true },
  {
    label: "AI-powered candidate recommendations (coming soon)",
    free: false,
    pro: true,
  },
  { label: "AI hiring chat assistant (coming soon)", free: false, pro: true },
];

function FeatureRow({ feature, tier }: { feature: PlanFeature; tier: "free" | "pro" }) {
  const included = tier === "free" ? feature.free : feature.pro;
  return (
    <li className="flex items-start gap-2.5 text-sm">
      {included ? (
        <Check
          className={cn("mt-0.5 h-4 w-4 shrink-0", ACCENT_TEXT)}
          aria-hidden="true"
        />
      ) : (
        <X
          className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50"
          aria-hidden="true"
        />
      )}
      <span className={included ? undefined : "text-muted-foreground"}>
        {feature.label}
      </span>
    </li>
  );
}

export function RecruiterUpgradePage() {
  const companyQuery = useCompanyProfile();
  const updateSubscription = useUpdateCompanySubscription();
  const currentTier = companyQuery.data?.subscriptionTier;

  function changeTier(tier: SubscriptionTier) {
    if (!companyQuery.data) {
      return;
    }

    updateSubscription.mutate(
      { id: companyQuery.data.id, tier },
      {
        onSuccess: () => {
          toast.success(
            tier === "PRO"
              ? "You're on Pro. Everything unlocks immediately — no need to sign in again."
              : "Moved back to the Free plan.",
          );
        },
        onError: (error) => {
          toast.error(
            getApiErrorMessage(error, "Couldn't update your subscription."),
          );
        },
      },
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="mb-8 text-center">
        <p className="text-sm font-medium text-primary">Plans</p>
        <h1 className="mt-2 text-4xl font-bold">
          Choose the plan that fits your hiring
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Start free with a full pipeline for one open role. Upgrade any time
          — Pro unlocks instantly, no payment step in this preview.
        </p>
      </div>

      {companyQuery.isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2">
          <Skeleton className="h-96 rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      ) : companyQuery.isError ? (
        <Card className={CARD_CLASS}>
          <CardContent className="p-6 text-center">
            <p className="text-sm text-destructive" role="alert">
              {getApiErrorMessage(
                companyQuery.error,
                "Couldn't load your company's plan.",
              )}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          <Card className={cn(CARD_CLASS, "flex flex-col")}>
            <CardHeader>
              <CardTitle className="text-2xl">Free</CardTitle>
              <CardDescription>
                Everything you need to run a single hiring pipeline.
              </CardDescription>
              <p className="pt-2 text-3xl font-bold">$0</p>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-6">
              <ul className="space-y-3">
                {FEATURES.map((feature) => (
                  <FeatureRow key={feature.label} feature={feature} tier="free" />
                ))}
              </ul>
              <Button
                type="button"
                variant="outline"
                className="mt-auto"
                disabled={currentTier === "FREE" || updateSubscription.isPending}
                onClick={() => changeTier("FREE")}
              >
                {currentTier === "FREE" ? "Current plan" : "Move to Free"}
              </Button>
            </CardContent>
          </Card>

          <Card
            className={cn(
              CARD_CLASS,
              "relative flex flex-col border-2 border-indigo-300 dark:border-indigo-700",
            )}
          >
            <Badge
              className={cn(
                "absolute -top-3 left-1/2 -translate-x-1/2 border-transparent text-white",
                ACCENT_GRADIENT,
              )}
            >
              <Sparkles className="mr-1 h-3 w-3" aria-hidden="true" />
              Most popular
            </Badge>
            <CardHeader>
              <CardTitle className="text-2xl">Pro</CardTitle>
              <CardDescription>
                AI scoring, a talent pool, and interview scorecards for teams
                hiring at scale.
              </CardDescription>
              <p className="pt-2 text-3xl font-bold">
                Free
                <span className="ml-1 text-sm font-normal text-muted-foreground">
                  in this preview
                </span>
              </p>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-6">
              <ul className="space-y-3">
                {FEATURES.map((feature) => (
                  <FeatureRow key={feature.label} feature={feature} tier="pro" />
                ))}
              </ul>
              <Button
                type="button"
                className="mt-auto"
                disabled={currentTier === "PRO" || updateSubscription.isPending}
                onClick={() => changeTier("PRO")}
              >
                {currentTier === "PRO"
                  ? "Current plan"
                  : updateSubscription.isPending
                    ? "Upgrading…"
                    : "Upgrade to Pro"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
