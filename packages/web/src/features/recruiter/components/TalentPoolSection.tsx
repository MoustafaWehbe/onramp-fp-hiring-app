import { Loader2, Send, Star, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "../../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import { useRecruiterJobs } from "../../jobs/hooks";
import { getApiErrorMessage } from "../../../lib/api-errors";
import type { RecruiterCandidateRecord } from "../../../types/recruiter";
import {
  useAddCandidateToPool,
  useCreateRecruiterTag,
  useDeleteRecruiterTag,
  useInviteCandidateToApply,
  useRecruiterTags,
  useRemoveCandidateFromPool,
  useUpdateCandidatePool,
} from "../hooks";

export function TalentPoolSection({
  candidate,
}: {
  candidate: RecruiterCandidateRecord;
}) {
  const tagsQuery = useRecruiterTags();
  const jobsQuery = useRecruiterJobs();
  const addToPool = useAddCandidateToPool();
  const updatePool = useUpdateCandidatePool();
  const removeFromPool = useRemoveCandidateFromPool();
  const createTag = useCreateRecruiterTag();
  const deleteTag = useDeleteRecruiterTag();
  const invite = useInviteCandidateToApply();
  const [notes, setNotes] = useState(candidate.poolEntry?.notes ?? "");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    candidate.poolEntry?.tags.map((tag) => tag.id) ?? [],
  );
  const [newTag, setNewTag] = useState("");
  const [jobId, setJobId] = useState("");
  const [poolMessage, setPoolMessage] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);
  const [inviteMessage, setInviteMessage] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    setNotes(candidate.poolEntry?.notes ?? "");
    setSelectedTagIds(
      candidate.poolEntry?.tags.map((tag) => tag.id) ?? [],
    );
  }, [candidate.poolEntry]);

  const appliedJobIds = useMemo(
    () =>
      new Set(
        (candidate.applicationInsights ?? []).map(
          (application) => application.jobId,
        ),
      ),
    [candidate.applicationInsights],
  );
  const openJobs = useMemo(
    () =>
      (jobsQuery.data ?? []).filter(
        (job) => job.status === "OPEN" && !appliedJobIds.has(job.id),
      ),
    [appliedJobIds, jobsQuery.data],
  );
  const isSaving = addToPool.isPending || updatePool.isPending;

  function toggleTag(tagId: string): void {
    setSelectedTagIds((current) =>
      current.includes(tagId)
        ? current.filter((id) => id !== tagId)
        : [...current, tagId],
    );
  }

  async function savePool(): Promise<void> {
    setPoolMessage(null);
    const variables = {
      candidateId: candidate.id,
      input: {
        notes: notes.trim() || null,
        tagIds: selectedTagIds,
      },
    };

    try {
      if (candidate.poolEntry) {
        await updatePool.mutateAsync(variables);
        setPoolMessage({ kind: "success", text: "Talent pool details saved." });
        toast.success("Talent pool details saved");
      } else {
        await addToPool.mutateAsync(variables);
        setPoolMessage({ kind: "success", text: "Candidate added to the talent pool." });
        toast.success("Candidate added to the talent pool");
      }
    } catch (error) {
      const message = getApiErrorMessage(
        error,
        "Couldn't save this candidate's talent pool details.",
      );
      setPoolMessage({ kind: "error", text: message });
      toast.error(message);
    }
  }

  async function removePoolEntry(): Promise<void> {
    setPoolMessage(null);
    try {
      await removeFromPool.mutateAsync(candidate.id);
      setPoolMessage({ kind: "success", text: "Candidate removed from the talent pool." });
      toast.success("Candidate removed from the talent pool");
    } catch (error) {
      const message = getApiErrorMessage(
        error,
        "Couldn't remove this candidate from the talent pool.",
      );
      setPoolMessage({ kind: "error", text: message });
      toast.error(message);
    }
  }

  async function addTag(): Promise<void> {
    const label = newTag.trim();
    if (!label) {
      return;
    }
    setPoolMessage(null);
    try {
      const tag = await createTag.mutateAsync(label);
      setSelectedTagIds((current) => [...new Set([...current, tag.id])]);
      setNewTag("");
      setPoolMessage({
        kind: "success",
        text: "Tag created. Save pool details to attach it.",
      });
    } catch (error) {
      setPoolMessage({
        kind: "error",
        text: getApiErrorMessage(error, "Couldn't create that tag."),
      });
    }
  }

  async function removeTag(tagId: string, label: string): Promise<void> {
    setPoolMessage(null);
    try {
      await deleteTag.mutateAsync(tagId);
      setSelectedTagIds((current) => current.filter((id) => id !== tagId));
      setPoolMessage({
        kind: "success",
        text: label + " was deleted from your company's tags.",
      });
    } catch (error) {
      setPoolMessage({
        kind: "error",
        text: getApiErrorMessage(error, "Couldn't delete that tag."),
      });
    }
  }

  async function sendInvite(): Promise<void> {
    if (!jobId) {
      return;
    }
    setInviteMessage(null);
    try {
      await invite.mutateAsync({ candidateId: candidate.id, jobId });
      const jobTitle =
        openJobs.find((job) => job.id === jobId)?.title ?? "the selected role";
      setInviteMessage({
        kind: "success",
        text: "Invitation sent for " + jobTitle + ".",
      });
      toast.success("Invitation sent");
    } catch (error) {
      const message = getApiErrorMessage(
        error,
        "Couldn't send the invitation. The job may no longer be open.",
      );
      setInviteMessage({ kind: "error", text: message });
      toast.error(message);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Star className="h-5 w-5 text-primary" aria-hidden="true" />
            Talent pool
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Private to your company and independent of any single application.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="talent-pool-notes">Private pool note</Label>
            <Textarea
              id="talent-pool-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Why should your team revisit this candidate?"
              className="mt-1 min-h-24"
            />
          </div>

          <div>
            <Label>Company tags</Label>
            {(tagsQuery.data?.length ?? 0) > 0 ? (
              <div className="mt-2 grid gap-2">
                {tagsQuery.data?.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
                  >
                    <label className="flex min-w-0 flex-1 items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedTagIds.includes(tag.id)}
                        onChange={() => toggleTag(tag.id)}
                      />
                      <span className="truncate">{tag.label}</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => void removeTag(tag.id, tag.label)}
                      disabled={deleteTag.isPending}
                      aria-label={"Delete " + tag.label + " tag"}
                      className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                No company tags yet.
              </p>
            )}
            <div className="mt-3 flex gap-2">
              <Input
                value={newTag}
                onChange={(event) => setNewTag(event.target.value)}
                placeholder="Create a tag"
                aria-label="New candidate tag"
                maxLength={80}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => void addTag()}
                disabled={!newTag.trim() || createTag.isPending}
              >
                Add tag
              </Button>
            </div>
          </div>

          {poolMessage && (
            <p
              role={poolMessage.kind === "error" ? "alert" : "status"}
              className={
                poolMessage.kind === "error"
                  ? "text-sm text-destructive"
                  : "text-sm text-emerald-700"
              }
            >
              {poolMessage.text}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => void savePool()}
              disabled={isSaving}
            >
              {isSaving && (
                <Loader2
                  className="mr-2 h-4 w-4 animate-spin"
                  aria-hidden="true"
                />
              )}
              {candidate.poolEntry ? "Save pool details" : "Add to talent pool"}
            </Button>
            {candidate.poolEntry && (
              <Button
                type="button"
                variant="outline"
                onClick={() => void removePoolEntry()}
                disabled={removeFromPool.isPending}
              >
                Remove from pool
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Send className="h-5 w-5 text-primary" aria-hidden="true" />
            Invite to apply
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Sends a real-time invitation. It does not create an application.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="invite-job">Open job</Label>
            <select
              id="invite-job"
              value={jobId}
              onChange={(event) => setJobId(event.target.value)}
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              disabled={jobsQuery.isLoading}
            >
              <option value="">Select an open job</option>
              {openJobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title}
                </option>
              ))}
            </select>
          </div>
          {jobsQuery.isError && (
            <p role="alert" className="text-sm text-destructive">
              Couldn't load open jobs.
            </p>
          )}
          {!jobsQuery.isLoading &&
            !jobsQuery.isError &&
            openJobs.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Your company has no open jobs to invite this candidate to.
              </p>
            )}
          {inviteMessage && (
            <p
              role={inviteMessage.kind === "error" ? "alert" : "status"}
              className={
                inviteMessage.kind === "error"
                  ? "text-sm text-destructive"
                  : "text-sm text-emerald-700"
              }
            >
              {inviteMessage.text}
            </p>
          )}
          <Button
            type="button"
            onClick={() => void sendInvite()}
            disabled={!jobId || invite.isPending}
          >
            {invite.isPending && (
              <Loader2
                className="mr-2 h-4 w-4 animate-spin"
                aria-hidden="true"
              />
            )}
            Send invitation
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
