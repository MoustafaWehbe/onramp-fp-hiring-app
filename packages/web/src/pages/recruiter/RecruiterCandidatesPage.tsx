import { FileText, Mail, MapPin, Search, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button, buttonVariants } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Skeleton } from "../../components/ui/skeleton";
import { useRecruiterCandidates } from "../../features/recruiter/hooks";
import { getApiErrorMessage } from "../../lib/api-errors";
import { cn } from "../../lib/utils";

export function RecruiterCandidatesPage() {
  const candidatesQuery = useRecruiterCandidates();
  const [search, setSearch] = useState("");
  const candidates = candidatesQuery.data ?? [];

  const visibleCandidates = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return candidates;
    }

    return candidates.filter((candidate) =>
      [
        candidate.user.name,
        candidate.user.email,
        candidate.headline,
        candidate.location,
      ].some((value) => value?.toLowerCase().includes(term)),
    );
  }, [candidates, search]);

  return (
    <div className="bg-muted/30">
      <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-sm font-medium text-primary">
            Recruiter candidates
          </p>
          <h1 className="mt-2 text-4xl font-bold">Candidates in your pipeline.</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Only candidates who submitted an application to your company are
            listed here.
          </p>
        </div>

        {!candidatesQuery.isLoading && !candidatesQuery.isError && (
          <div className="relative mb-6 max-w-md">
            <Search
              className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search candidates"
              aria-label="Search candidates"
              className="pl-9"
            />
          </div>
        )}

        {candidatesQuery.isLoading && (
          <div
            className="grid gap-4 md:grid-cols-2"
            aria-label="Loading candidates"
          >
            {[0, 1, 2, 3].map((item) => (
              <Skeleton key={item} className="h-52 rounded-lg" />
            ))}
          </div>
        )}

        {candidatesQuery.isError && (
          <Card role="alert">
            <CardContent className="flex flex-col items-start gap-4 p-6">
              <div>
                <h2 className="font-semibold">Candidates unavailable</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {getApiErrorMessage(
                    candidatesQuery.error,
                    "Couldn't load your company's candidates.",
                  )}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => void candidatesQuery.refetch()}
              >
                Try again
              </Button>
            </CardContent>
          </Card>
        )}

        {candidatesQuery.isSuccess && visibleCandidates.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="font-semibold">
                {candidates.length === 0
                  ? "No candidates yet"
                  : "No candidates match your search"}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {candidates.length === 0
                  ? "Submitted applications will add candidates to this list."
                  : "Try a name, email, role, or location."}
              </p>
            </CardContent>
          </Card>
        )}

        {visibleCandidates.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            {visibleCandidates.map((candidate) => (
              <Card key={candidate.id}>
                <CardContent className="flex h-full flex-col p-5">
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <UserRound className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-semibold">
                        {candidate.user.name}
                      </h2>
                      <a
                        href={`mailto:${candidate.user.email}`}
                        className="mt-1 inline-flex max-w-full items-center gap-1.5 truncate text-sm text-muted-foreground hover:text-foreground"
                      >
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        {candidate.user.email}
                      </a>
                    </div>
                  </div>

                  <p className="mt-4 font-medium">
                    {candidate.headline ?? "Candidate"}
                  </p>
                  {candidate.location && (
                    <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" aria-hidden="true" />
                      {candidate.location}
                    </p>
                  )}
                  {candidate.bio && (
                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">
                      {candidate.bio}
                    </p>
                  )}

                  <div className="mt-auto flex flex-wrap gap-2 pt-5">
                    <Link
                      to={`/recruiter/candidates/${candidate.id}`}
                      className={cn(
                        buttonVariants({ variant: "outline", size: "sm" }),
                      )}
                    >
                      View profile
                    </Link>
                    {candidate.resumeUrl && (
                      <a
                        href={candidate.resumeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={cn(
                          buttonVariants({ variant: "secondary", size: "sm" }),
                        )}
                      >
                        <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
                        Resume
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
