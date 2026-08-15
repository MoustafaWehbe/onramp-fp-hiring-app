import { Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Button, buttonVariants } from "../../../components/ui/button";
import { getApiErrorMessage } from "../../../lib/api-errors";
import { cn } from "../../../lib/utils";
import { useEasyApply, useEasyApplyReadiness } from "../hooks";

/**
 * One-click apply from the standing profile.
 *
 * Deliberately does not render for a candidate who has nothing to send: with
 * no resume and an empty profile there is nothing to snapshot and nothing for
 * the fit scorer to read, so they are pointed at their profile instead of
 * being allowed to submit a blank application.
 */
export function EasyApplyButton({
  jobId,
  disabled = false,
  onApplied,
  className,
}: {
  jobId: string;
  disabled?: boolean;
  onApplied?: (application: { id: string; jobId: string; stage: string }) => void;
  className?: string;
}) {
  const readinessQuery = useEasyApplyReadiness();
  const easyApply = useEasyApply();

  // While readiness is unknown, show nothing rather than a button that might
  // immediately fail.
  if (readinessQuery.isLoading || readinessQuery.isError) {
    return null;
  }

  const readiness = readinessQuery.data;

  if (!readiness?.ready) {
    return (
      <Link
        to="/candidate/profile"
        className={cn(
          buttonVariants({ variant: "outline" }),
          "gap-2",
          className,
        )}
        title={
          readiness?.missing.length
            ? `Add ${readiness.missing.join(" and ")} to use Easy Apply`
            : undefined
        }
      >
        <Zap className="h-4 w-4" aria-hidden="true" />
        Complete profile to Easy Apply
      </Link>
    );
  }

  function apply(): void {
    easyApply.mutate(
      { jobId },
      {
        onSuccess: (application) => {
          toast.success("Applied with your profile.");
          onApplied?.(application);
        },
        onError: (error) => {
          toast.error(
            getApiErrorMessage(error, "Couldn't submit your application."),
          );
        },
      },
    );
  }

  return (
    <Button
      type="button"
      size="lg"
      onClick={apply}
      disabled={disabled || easyApply.isPending}
      // Deliberately the heaviest control on the page: the gradient and lift
      // mark it as the primary path, with the CV upload below reading as the
      // alternative it now is.
      className={cn(
  "gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-base font-semibold text-white shadow-md shadow-indigo-500/20 transition-all hover:from-indigo-500 hover:to-violet-500 hover:shadow-lg hover:shadow-indigo-500/25",
  className,
)}
    >
      <Zap className="h-4 w-4" aria-hidden="true" />
      {easyApply.isPending ? "Applying…" : "Easy Apply"}
    </Button>
  );
}
