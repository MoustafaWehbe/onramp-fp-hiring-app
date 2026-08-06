import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../../components/ui/button";
import { LoadingSpinner } from "../../../components/shared/LoadingSpinner";
import { getApiErrorMessage } from "../../../lib/api-errors";
import { useApplicationScorecards, useScorecardTemplates } from "../hooks";
import { ScorecardAggregateView } from "./ScorecardAggregateView";
import { ScorecardForm } from "./ScorecardForm";

/**
 * Everything scorecard-shaped for one application: the aggregate, and the
 * caller's own submission form.
 *
 * Both halves depend on the template list, so the "no template configured
 * yet" case is handled once here rather than inside the form — a recruiter
 * who has not set one up gets a route to fix it instead of a form with
 * nothing to score.
 */
export function ScorecardPanel({
  applicationId,
}: {
  applicationId: string;
}) {
  const templatesQuery = useScorecardTemplates();
  const scorecardsQuery = useApplicationScorecards(applicationId);
  const [isFormOpen, setIsFormOpen] = useState(false);

  if (templatesQuery.isLoading || scorecardsQuery.isLoading) {
    return (
      <div className="flex justify-center py-6">
        <LoadingSpinner />
      </div>
    );
  }

  if (scorecardsQuery.isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {getApiErrorMessage(
          scorecardsQuery.error,
          "Couldn't load scorecards for this application.",
        )}
      </p>
    );
  }

  const templates = templatesQuery.data?.templates ?? [];
  const aggregate = scorecardsQuery.data;
  const mine = aggregate?.scorecards.find((scorecard) => scorecard.isMine);

  return (
    <div className="space-y-4">
      {aggregate && <ScorecardAggregateView aggregate={aggregate} />}

      {templates.length === 0 ? (
        <div className="rounded-md border border-dashed bg-muted/20 p-4">
          <p className="text-sm font-medium">No scorecard template yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Scorecards need a set of criteria to score against. Create one for
            your company and it becomes available on every candidate.
          </p>
          <Link
            to="/recruiter/scorecard-templates"
            className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
          >
            Set up a scorecard template
          </Link>
        </div>
      ) : isFormOpen ? (
        <div className="rounded-md border bg-muted/10 p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm font-medium">
              {mine ? "Update your scorecard" : "Your scorecard"}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsFormOpen(false)}
            >
              Cancel
            </Button>
          </div>
          <ScorecardForm
            applicationId={applicationId}
            templates={templates}
            existing={mine}
            onSubmitted={() => setIsFormOpen(false)}
          />
        </div>
      ) : (
        <Button type="button" onClick={() => setIsFormOpen(true)}>
          {mine ? "Edit my scorecard" : "Submit a scorecard"}
        </Button>
      )}
    </div>
  );
}
