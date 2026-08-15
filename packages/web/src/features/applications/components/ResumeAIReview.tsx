import { useEffect, useState } from "react";
import { Lightbulb, Sparkles, ThumbsDown, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { getApiErrorMessage } from "../../../lib/api-errors";
import { cn } from "../../../lib/utils";
import { CARD_CLASS, TEXT_META } from "../../candidate/theme";
import { useReviewResumeForJob } from "../../candidate/hooks";
import type { ResumeReviewResult } from "../../../types/candidate";

// The free model backing this can take 10-30s. Below this, a plain
// "Reviewing…" reads as normal; past it, a candidate watching a spinner with
// no feedback starts to wonder if it's stuck, so the copy changes to say so.
const SLOW_RESPONSE_THRESHOLD_MS = 8_000;

function scoreTone(score: number): string {
  if (score >= 75) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function ReviewList({
  icon: Icon,
  label,
  items,
  tone,
}: {
  icon: typeof ThumbsUp;
  label: string;
  items: string[];
  tone: string;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div>
      <p className={cn("mb-1.5 flex items-center gap-1.5 text-sm font-semibold", tone)}>
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
        {label}
      </p>
      <ul className="space-y-1 pl-5 text-sm">
        {items.map((item, index) => (
          <li key={index} className="list-disc text-muted-foreground">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

interface ResumeAIReviewProps {
  jobId: string;
  /** The CV currently staged for this application, if any — reviewed as-is when present. */
  resumeFile: File | null;
  /**
   * Fires on every successful review, so the page can gate submission on
   * whether the latest review flagged issues.
   */
  onResult: (result: ResumeReviewResult) => void;
}

/**
 * Scoped to one job on one page visit: nothing here is cached or written to
 * the server beyond the request that produced it, so navigating away (or
 * asking again) always starts fresh.
 */
export function ResumeAIReview({ jobId, resumeFile, onResult }: ResumeAIReviewProps) {
  const review = useReviewResumeForJob();
  const result = review.data ?? null;
  const [isTakingLong, setIsTakingLong] = useState(false);

  useEffect(() => {
    if (!review.isPending) {
      setIsTakingLong(false);
      return;
    }

    const timer = setTimeout(() => setIsTakingLong(true), SLOW_RESPONSE_THRESHOLD_MS);
    return () => clearTimeout(timer);
  }, [review.isPending]);

  function runReview() {
    review.mutate(
      { jobId, resumeFile },
      {
        onSuccess: (data) => onResult(data),
        onError: (error) => {
          toast.error(
            getApiErrorMessage(error, "Couldn't generate an AI review right now."),
          );
        },
      },
    );
  }

  return (
    <Card className={CARD_CLASS}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-4 w-4 text-indigo-500" aria-hidden="true" />
          AI Resume Review
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className={cn("text-xs", TEXT_META)}>
          Checks your resume against this role's requirements — pros, cons, and
          suggestions specific to this job. Not saved: re-run any time.
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={runReview}
          disabled={review.isPending}
        >
          {review.isPending
            ? isTakingLong
              ? "Still reviewing…"
              : "Reviewing…"
            : result
              ? "Review again"
              : "Review with AI"}
        </Button>
        {review.isPending && isTakingLong && (
          <p className={cn("text-xs", TEXT_META)} role="status">
            Taking longer than usual — free AI models can take up to 30
            seconds. Still working on it.
          </p>
        )}

        {result && (
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-baseline gap-2">
              <span className={cn("text-3xl font-bold", scoreTone(result.score))}>
                {result.score}
              </span>
              <span className={cn("text-sm", TEXT_META)}>
                / 100 vs. typical applicants for this role
              </span>
            </div>

            <ReviewList
              icon={ThumbsUp}
              label="Strengths"
              items={result.pros}
              tone="text-emerald-600 dark:text-emerald-400"
            />
            <ReviewList
              icon={ThumbsDown}
              label="Gaps"
              items={result.cons}
              tone="text-red-600 dark:text-red-400"
            />
            <ReviewList
              icon={Lightbulb}
              label="Suggestions"
              items={result.suggestions}
              tone="text-amber-600 dark:text-amber-400"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
