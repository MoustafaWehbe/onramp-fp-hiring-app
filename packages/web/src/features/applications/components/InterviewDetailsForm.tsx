import { useState } from "react";
import { toast } from "sonner";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import { getApiErrorMessage } from "../../../lib/api-errors";
import { formatDate } from "../../../lib/utils";
import { useUpdateApplicationInterview } from "../hooks";
import { fromInterviewDateInput, toInterviewDateInput } from "../interview-date";

interface InterviewDetailsFormProps {
  applicationId: string;
  jobId: string;
  candidateProfileId?: string;
  interviewDate: string | null;
  recruiterNotes: string | null;
  interviewScheduledAt: string | null;
}

/**
 * Deliberately stage-agnostic: a recruiter can jot a note on an APPLIED
 * candidate and can still edit one after an offer or rejection.
 */
export function InterviewDetailsForm({
  applicationId,
  jobId,
  candidateProfileId,
  interviewDate,
  recruiterNotes,
  interviewScheduledAt,
}: InterviewDetailsFormProps) {
  const updateInterview = useUpdateApplicationInterview();
  const [dateValue, setDateValue] = useState(() =>
    toInterviewDateInput(interviewDate),
  );
  const [notesValue, setNotesValue] = useState(recruiterNotes ?? "");
  const [saved, setSaved] = useState({ interviewDate, recruiterNotes });

  // Another recruiter's save (or a refetch) is the newer truth, so adopt it.
  // Unsaved edits are only discarded when the stored values actually changed,
  // which is the last-write-wins behaviour this phase asks for.
  if (
    saved.interviewDate !== interviewDate ||
    saved.recruiterNotes !== recruiterNotes
  ) {
    setSaved({ interviewDate, recruiterNotes });
    setDateValue(toInterviewDateInput(interviewDate));
    setNotesValue(recruiterNotes ?? "");
  }

  const nextInterviewDate = fromInterviewDateInput(dateValue);
  const nextRecruiterNotes = notesValue.trim() ? notesValue : null;
  const dateChanged = nextInterviewDate !== (interviewDate ?? null);
  const notesChanged = nextRecruiterNotes !== (recruiterNotes ?? null);
  const hasChanges = dateChanged || notesChanged;
  const dateFieldId = `interview-date-${applicationId}`;
  const notesFieldId = `recruiter-notes-${applicationId}`;

  function save() {
    if (!hasChanges) {
      return;
    }

    updateInterview.mutate(
      {
        applicationId,
        jobId,
        candidateProfileId,
        // Only changed keys are sent so saving a note never disturbs a date.
        ...(dateChanged ? { interviewDate: nextInterviewDate } : {}),
        ...(notesChanged ? { recruiterNotes: nextRecruiterNotes } : {}),
      },
      {
        onSuccess: () => {
          toast.success("Interview details saved.");
        },
        onError: (error) => {
          toast.error(
            getApiErrorMessage(error, "Couldn't save the interview details."),
          );
        },
      },
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={dateFieldId}>Interview date</Label>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            id={dateFieldId}
            type="datetime-local"
            className="w-auto"
            value={dateValue}
            onChange={(event) => setDateValue(event.target.value)}
          />
          {dateValue && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setDateValue("")}
            >
              Clear date
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {interviewScheduledAt
            ? `First scheduled ${formatDate(interviewScheduledAt)}.`
            : "Optional — leave empty and set it once a time is agreed."}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor={notesFieldId}>Recruiter notes</Label>
        <Textarea
          id={notesFieldId}
          rows={4}
          value={notesValue}
          placeholder="What stood out, what to probe next, anything the team should know."
          onChange={(event) => setNotesValue(event.target.value)}
        />
      </div>

      <Button
        type="button"
        size="sm"
        onClick={save}
        disabled={!hasChanges || updateInterview.isPending}
      >
        {updateInterview.isPending ? "Saving…" : "Save interview details"}
      </Button>
    </div>
  );
}
