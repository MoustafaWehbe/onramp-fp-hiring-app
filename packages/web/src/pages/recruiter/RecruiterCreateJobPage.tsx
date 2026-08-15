import { isAxiosError } from "axios";
import { Building2, FilePlus2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
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
import { useCompanyProfile } from "../../features/company/hooks";
import { RecruiterJobForm } from "../../features/jobs/components/RecruiterJobForm";
import { useCreateRecruiterJob } from "../../features/jobs/hooks";
import { getApiErrorMessage } from "../../lib/api-errors";
import { cn } from "../../lib/utils";
import type { RecruiterJobCreateInput } from "../../types/jobs";

function CreateJobSkeleton() {
  return (
    <Card aria-label="Loading job form">
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

export function RecruiterCreateJobPage() {
  const navigate = useNavigate();
  const companyQuery = useCompanyProfile();
  const createJob = useCreateRecruiterJob();
  const companyMissing =
    isAxiosError(companyQuery.error) &&
    companyQuery.error.response?.status === 404;

  async function submit(input: RecruiterJobCreateInput) {
    try {
      await createJob.mutateAsync(input);
      toast.success(
        input.status === "OPEN" ? "Job published" : "Draft saved",
      );
      navigate("/recruiter/jobs");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't create this job."));
    }
  }

  const setupRequired =
    companyMissing ||
    (companyQuery.data != null && !companyQuery.data.profileComplete);

  return (
    // Single-form page — narrower than the shared 7xl frame, same width as
    // before, just anchored inside it instead of independently centered.
    <div className="max-w-4xl">
      <div className="mb-8">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FilePlus2 className="h-5 w-5" aria-hidden="true" />
          </div>
          <p className="text-sm font-medium text-primary">Recruiter jobs</p>
          <h1 className="mt-2 text-4xl font-bold">Create a job</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Build a clear, structured posting and save it privately or open it
            to candidates.
          </p>
        </div>

        {companyQuery.isLoading ? (
          <CreateJobSkeleton />
        ) : companyQuery.isError && !companyMissing ? (
          <Card>
            <CardContent className="space-y-4 p-6">
              <p className="text-sm text-destructive" role="alert">
                {getApiErrorMessage(
                  companyQuery.error,
                  "Couldn't confirm your company profile.",
                )}
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => void companyQuery.refetch()}
              >
                Try again
              </Button>
            </CardContent>
          </Card>
        ) : setupRequired ? (
          <Card>
            <CardHeader>
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <Building2 className="h-5 w-5" aria-hidden="true" />
              </div>
              <CardTitle>Complete your company profile first</CardTitle>
              <CardDescription>
                Add your company name, industry, size, location, and hiring
                contact before creating a posting.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                to="/recruiter/company/create"
                className={buttonVariants({ variant: "default" })}
              >
                Set up company profile
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Job details</CardTitle>
              <CardDescription>
                Posting for {companyQuery.data?.name}. Required fields are
                validated before saving.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RecruiterJobForm
                mode="create"
                isSubmitting={createJob.isPending}
                submitLabel="Create job"
                onSubmit={submit}
              />
            </CardContent>
          </Card>
        )}

        <Link
          to="/recruiter/jobs"
          className={cn(
            buttonVariants({ variant: "ghost" }),
            "mt-5 px-0 hover:bg-transparent",
          )}
        >
          Back to jobs
        </Link>
    </div>
  );
}
