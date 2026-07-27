import { isAxiosError } from "axios";
import { ArrowLeft, FileText, Mail, MapPin, Phone } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { Button, buttonVariants } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Skeleton } from "../../components/ui/skeleton";
import { useRecruiterCandidate } from "../../features/recruiter/hooks";
import { getApiErrorMessage } from "../../lib/api-errors";
import { cn } from "../../lib/utils";

export function RecruiterCandidateDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const candidateQuery = useRecruiterCandidate(id);

  if (candidateQuery.isLoading) {
    return (
      <div
        className="mx-auto w-full max-w-4xl space-y-5 px-4 py-8 sm:px-6 lg:px-8"
        aria-label="Loading candidate profile"
      >
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-36 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  const notFound =
    isAxiosError(candidateQuery.error) &&
    candidateQuery.error.response?.status === 404;

  if (!candidateQuery.data) {
    return (
      <section className="mx-auto flex min-h-[65vh] max-w-2xl flex-col items-center justify-center px-4 text-center">
        <h1 className="text-3xl font-bold">
          {notFound ? "Candidate not found" : "Candidate unavailable"}
        </h1>
        <p className="mt-3 text-muted-foreground" role="alert">
          {notFound
            ? "This candidate is not part of your company's application pipeline."
            : getApiErrorMessage(
                candidateQuery.error,
                "Couldn't load this candidate profile.",
              )}
        </p>
        <div className="mt-6 flex gap-3">
          {!notFound && (
            <Button
              type="button"
              variant="outline"
              onClick={() => void candidateQuery.refetch()}
            >
              Try again
            </Button>
          )}
          <Link
            to="/recruiter/candidates"
            className={buttonVariants({ variant: notFound ? "default" : "secondary" })}
          >
            Back to candidates
          </Link>
        </div>
      </section>
    );
  }

  const candidate = candidateQuery.data;

  return (
    <div className="bg-muted/30">
      <section className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          to="/recruiter/candidates"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to candidates
        </Link>

        <Card className="mt-6">
          <CardHeader>
            <p className="text-sm font-medium text-primary">
              Candidate profile
            </p>
            <CardTitle className="text-3xl">{candidate.user.name}</CardTitle>
            <p className="text-lg text-muted-foreground">
              {candidate.headline ?? "Candidate"}
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm">
              <a
                href={`mailto:${candidate.user.email}`}
                className="inline-flex items-center gap-2 hover:text-primary"
              >
                <Mail className="h-4 w-4 text-muted-foreground" />
                {candidate.user.email}
              </a>
              {candidate.phone && (
                <a
                  href={`tel:${candidate.phone}`}
                  className="inline-flex items-center gap-2 hover:text-primary"
                >
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {candidate.phone}
                </a>
              )}
              {candidate.location && (
                <span className="inline-flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  {candidate.location}
                </span>
              )}
            </div>

            <div className="border-t pt-6">
              <h2 className="font-semibold">About</h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-7 text-muted-foreground">
                {candidate.bio ?? "No biography provided."}
              </p>
            </div>

            {candidate.resumeUrl && (
              <a
                href={candidate.resumeUrl}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "gap-2",
                )}
              >
                <FileText className="h-4 w-4" aria-hidden="true" />
                View resume
              </a>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
