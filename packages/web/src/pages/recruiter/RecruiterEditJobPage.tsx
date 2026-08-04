import { isAxiosError } from "axios";
import { PencilLine } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Button, buttonVariants } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Skeleton } from "../../components/ui/skeleton";
import { RecruiterJobForm } from "../../features/jobs/components/RecruiterJobForm";
import {
  useRecruiterJob,
  useUpdateRecruiterJob,
} from "../../features/jobs/hooks";
import { getApiErrorMessage } from "../../lib/api-errors";
import type { RecruiterJobInput } from "../../types/jobs";

function EditJobSkeleton() {
  return (
    <Card aria-label="Loading job">
      <CardHeader className="space-y-3">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-3/4" />
      </CardHeader>
      <CardContent className="space-y-6">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function RecruiterEditJobPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const jobQuery = useRecruiterJob(id);
  const updateJob = useUpdateRecruiterJob();
  const jobNotFound =
    isAxiosError(jobQuery.error) &&
    jobQuery.error.response?.status === 404;

  async function submit(input: RecruiterJobInput) {
    if (!id) {
      return;
    }

    try {
      await updateJob.mutateAsync({ id, input });
      toast.success(
        input.status === "OPEN"
          ? "Job updated and published"
          : input.status === "CLOSED"
            ? "Job closed"
            : "Draft updated",
      );
      navigate("/recruiter/jobs");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't update this job."));
    }
  }

  return (
    <div className="bg-muted/30">
      <section className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <PencilLine className="h-5 w-5" aria-hidden="true" />
          </div>
          <p className="text-sm font-medium text-primary">Recruiter jobs</p>
          <h1 className="mt-2 text-4xl font-bold">Edit job</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Keep the role details accurate and choose whether it stays private
            or is open to candidates.
          </p>
        </div>

        {jobQuery.isLoading ? (
          <EditJobSkeleton />
        ) : jobNotFound ? (
          <Card>
            <CardContent className="space-y-4 p-6 text-center">
              <CardTitle>Job not found</CardTitle>
              <p className="text-sm text-muted-foreground">
                This job may not exist or may belong to another company.
              </p>
              <Link
                to="/recruiter/jobs"
                className={buttonVariants({ variant: "outline" })}
              >
                Back to jobs
              </Link>
            </CardContent>
          </Card>
        ) : jobQuery.isError || !jobQuery.data ? (
          <Card>
            <CardContent className="space-y-4 p-6">
              <p className="text-sm text-destructive" role="alert">
                {getApiErrorMessage(
                  jobQuery.error,
                  "Couldn't load this job.",
                )}
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => void jobQuery.refetch()}
              >
                Try again
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>{jobQuery.data.title}</CardTitle>
              <CardDescription>
                Changes appear in the public listing when this job is open.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RecruiterJobForm
                key={jobQuery.data.id}
                mode="edit"
                initialJob={jobQuery.data}
                isSubmitting={updateJob.isPending}
                submitLabel="Save changes"
                onSubmit={submit}
              />
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
