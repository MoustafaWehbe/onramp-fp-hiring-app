import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../../components/ui/button";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import { getApiErrorMessage } from "../../../lib/api-errors";
import type {
  InterviewScorecard,
  ScorecardTemplate,
} from "../../../types/scorecards";
import { useSubmitScorecard } from "../hooks";
import { RatingSelector } from "./RatingSelector";

interface ScorecardFormProps {
  applicationId: string;
  templates: ScorecardTemplate[];
  /** The caller's own previous submission, if they have one. */
  existing?: InterviewScorecard;
  onSubmitted?: () => void;
}

interface DraftRating {
  rating: number | null;
  comment: string;
}

/**
 * The submission form.
 *
 * Seeded from the caller's own previous scorecard when there is one, because
 * the endpoint replaces rather than appends — showing a blank form would
 * invite someone to overwrite their earlier answers without seeing them.
 */
export function ScorecardForm({
  applicationId,
  templates,
  existing,
  onSubmitted,
}: ScorecardFormProps) {
  const submit = useSubmitScorecard();

  const [templateId, setTemplateId] = useState<string>(
    () => existing?.templateId ?? templates[0]?.id ?? "",
  );
  const template =
    templates.find((candidate) => candidate.id === templateId) ?? templates[0];

  const [draft, setDraft] = useState<Record<string, DraftRating>>(() =>
    buildInitialDraft(existing),
  );
  const [overallComment, setOverallComment] = useState(
    () => existing?.overallComment ?? "",
  );
  const [error, setError] = useState<string | null>(null);

  if (!template) {
    return null;
  }

  const setRating = (criterionId: string, rating: number) => {
    setDraft((current) => ({
      ...current,
      [criterionId]: { rating, comment: current[criterionId]?.comment ?? "" },
    }));
  };

  const setComment = (criterionId: string, comment: string) => {
    setDraft((current) => ({
      ...current,
      [criterionId]: {
        rating: current[criterionId]?.rating ?? null,
        comment,
      },
    }));
  };

  const scored = template.criteria.filter(
    (criterion) => draft[criterion.id]?.rating != null,
  );

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (scored.length === 0) {
      setError("Score at least one criterion before submitting.");
      return;
    }

    try {
      setError(null);
      await submit.mutateAsync({
        applicationId,
        templateId: template.id,
        overallComment: overallComment.trim() || null,
        // Only scored criteria are sent. A criterion left blank is one this
        // interviewer is not rating, which is different from rating it low.
        ratings: scored.map((criterion) => ({
          criterionId: criterion.id,
          rating: draft[criterion.id]!.rating!,
          comment: draft[criterion.id]?.comment.trim() || null,
        })),
      });
      onSubmitted?.();
    } catch (err) {
      setError(
        getApiErrorMessage(err, "We couldn't save your scorecard. Try again."),
      );
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {error && (
        <p
          role="alert"
          className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      {templates.length > 1 && (
        <div className="space-y-2">
          <Label htmlFor={`template-${applicationId}`}>Scorecard</Label>
          <select
            id={`template-${applicationId}`}
            value={template.id}
            onChange={(event) => {
              setTemplateId(event.target.value);
              setDraft({});
            }}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            {templates.map((option) => (
              <option key={option.id} value={option.id}>
                {option.title}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-5">
        {template.criteria.map((criterion) => (
          <div key={criterion.id} className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium">{criterion.label}</p>
                {criterion.description && (
                  <p className="text-xs text-muted-foreground">
                    {criterion.description}
                  </p>
                )}
              </div>
              <RatingSelector
                name={`rating-${criterion.id}`}
                label={criterion.label}
                value={draft[criterion.id]?.rating ?? null}
                onChange={(rating) => setRating(criterion.id, rating)}
                disabled={submit.isPending}
              />
            </div>
            <Textarea
              aria-label={`${criterion.label} comment`}
              placeholder={`Notes on ${criterion.label.toLowerCase()} (optional)`}
              rows={2}
              value={draft[criterion.id]?.comment ?? ""}
              onChange={(event) => setComment(criterion.id, event.target.value)}
              disabled={submit.isPending}
            />
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <Label htmlFor={`overall-${applicationId}`}>Overall comment</Label>
        <Textarea
          id={`overall-${applicationId}`}
          placeholder="Your overall read on this candidate (optional)"
          rows={3}
          value={overallComment}
          onChange={(event) => setOverallComment(event.target.value)}
          disabled={submit.isPending}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={submit.isPending}>
          {submit.isPending
            ? "Saving..."
            : existing
              ? "Update my scorecard"
              : "Submit scorecard"}
        </Button>
        <p className="text-xs text-muted-foreground">
          {existing
            ? "This replaces your previous submission — it won't be counted twice."
            : `Scoring ${scored.length} of ${template.criteria.length} criteria.`}
        </p>
      </div>

      <p className="text-xs text-muted-foreground">
        Criteria come from{" "}
        <Link
          to="/recruiter/scorecard-templates"
          className="text-primary hover:underline"
        >
          your scorecard templates
        </Link>
        .
      </p>
    </form>
  );
}

function buildInitialDraft(
  existing?: InterviewScorecard,
): Record<string, DraftRating> {
  if (!existing) {
    return {};
  }

  return Object.fromEntries(
    existing.ratings.map((rating) => [
      rating.criterionId,
      { rating: rating.rating, comment: rating.comment ?? "" },
    ]),
  );
}
