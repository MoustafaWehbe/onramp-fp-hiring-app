import {
  FileText,
  Mail,
  MapPin,
  Search,
  Sparkles,
  Star,
  UserRound,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "../../components/ui/badge";
import { Button, buttonVariants } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Skeleton } from "../../components/ui/skeleton";
import {
  useRecruiterCandidates,
  useRecruiterTags,
} from "../../features/recruiter/hooks";
import { getApiErrorMessage } from "../../lib/api-errors";
import { cn } from "../../lib/utils";
import type { RecruiterCandidateFilters } from "../../types/recruiter";

function optionalNumber(value: string): number | undefined {
  return value === "" ? undefined : Number(value);
}

export function RecruiterCandidatesPage() {
  const [search, setSearch] = useState("");
  const [tagId, setTagId] = useState("");
  const [skill, setSkill] = useState("");
  const [minFitScore, setMinFitScore] = useState("");
  const [maxFitScore, setMaxFitScore] = useState("");
  const [minScorecardAverage, setMinScorecardAverage] = useState("");
  const [poolStatus, setPoolStatus] = useState<
    "all" | "in_pool" | "not_in_pool"
  >("all");

  const filters = useMemo<RecruiterCandidateFilters>(
    () => ({
      search: search.trim() || undefined,
      tagId: tagId || undefined,
      skill: skill.trim() || undefined,
      minFitScore: optionalNumber(minFitScore),
      maxFitScore: optionalNumber(maxFitScore),
      minScorecardAverage: optionalNumber(minScorecardAverage),
      poolStatus,
    }),
    [
      maxFitScore,
      minFitScore,
      minScorecardAverage,
      poolStatus,
      search,
      skill,
      tagId,
    ],
  );
  const candidatesQuery = useRecruiterCandidates(filters);
  const tagsQuery = useRecruiterTags();
  const candidates = candidatesQuery.data ?? [];

  // The API is authoritative, while this local pass keeps filtering immediate
  // when cached data is still on screen during a query-key transition.
  const visibleCandidates = useMemo(() => {
    const term = search.trim().toLowerCase();
    const skillTerm = skill.trim().toLowerCase();
    const minimumFit = optionalNumber(minFitScore);
    const maximumFit = optionalNumber(maxFitScore);
    const minimumAverage = optionalNumber(minScorecardAverage);

    return candidates.filter((candidate) => {
      if (
        term &&
        ![
          candidate.user.name,
          candidate.user.email,
          candidate.headline,
          candidate.location,
        ].some((value) => value?.toLowerCase().includes(term))
      ) {
        return false;
      }
      if (
        tagId &&
        !candidate.poolEntry?.tags.some((tag) => tag.id === tagId)
      ) {
        return false;
      }
      if (
        skillTerm &&
        !(candidate.skills ?? []).some((item) =>
          item.name.toLowerCase().includes(skillTerm),
        )
      ) {
        return false;
      }
      if (poolStatus === "in_pool" && !candidate.poolEntry) {
        return false;
      }
      if (poolStatus === "not_in_pool" && candidate.poolEntry) {
        return false;
      }
      const fitScores = (candidate.applicationInsights ?? [])
        .map((application) => application.fitScore)
        .filter((score): score is number => score !== null);
      if (
        minimumFit !== undefined &&
        !fitScores.some(
          (score) =>
            score >= minimumFit &&
            (maximumFit === undefined || score <= maximumFit),
        )
      ) {
        return false;
      }
      if (
        minimumFit === undefined &&
        maximumFit !== undefined &&
        !fitScores.some((score) => score <= maximumFit)
      ) {
        return false;
      }
      if (
        minimumAverage !== undefined &&
        (candidate.metrics?.scorecardAverage == null ||
          candidate.metrics.scorecardAverage < minimumAverage)
      ) {
        return false;
      }
      return true;
    });
  }, [
    candidates,
    maxFitScore,
    minFitScore,
    minScorecardAverage,
    poolStatus,
    search,
    skill,
    tagId,
  ]);

  const filtersActive = Boolean(
    search ||
      tagId ||
      skill ||
      minFitScore ||
      maxFitScore ||
      minScorecardAverage ||
      poolStatus !== "all",
  );

  function clearFilters(): void {
    setSearch("");
    setTagId("");
    setSkill("");
    setMinFitScore("");
    setMaxFitScore("");
    setMinScorecardAverage("");
    setPoolStatus("all");
  }

  return (
    <div className="bg-muted/30">
      <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-sm font-medium text-primary">Recruiter CRM</p>
          <h1 className="mt-2 text-4xl font-bold">Talent pool & candidates</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Revisit everyone who has applied to your company, keep private
            notes and tags, and find the right person for a future opening.
          </p>
        </div>

        <Card className="mb-6">
            <CardContent className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
              <div className="relative sm:col-span-2">
                <Label htmlFor="candidate-search">Search</Label>
                <Search
                  className="pointer-events-none absolute left-3 top-9 h-4 w-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="candidate-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Name, email, role, or location"
                  aria-label="Search candidates"
                  className="mt-1 pl-9"
                />
              </div>
              <div>
                <Label htmlFor="candidate-tag">Tag</Label>
                <select
                  id="candidate-tag"
                  value={tagId}
                  onChange={(event) => setTagId(event.target.value)}
                  className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">All tags</option>
                  {(tagsQuery.data ?? []).map((tag) => (
                    <option key={tag.id} value={tag.id}>
                      {tag.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="pool-status">Pool status</Label>
                <select
                  id="pool-status"
                  value={poolStatus}
                  onChange={(event) =>
                    setPoolStatus(
                      event.target.value as
                        | "all"
                        | "in_pool"
                        | "not_in_pool",
                    )
                  }
                  className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="all">All candidates</option>
                  <option value="in_pool">In talent pool</option>
                  <option value="not_in_pool">Not in pool</option>
                </select>
              </div>
              <div>
                <Label htmlFor="candidate-skill">Skill</Label>
                <Input
                  id="candidate-skill"
                  value={skill}
                  onChange={(event) => setSkill(event.target.value)}
                  placeholder="e.g. TypeScript"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="fit-min">Fit score range</Label>
                <div className="mt-1 flex gap-2">
                  <Input
                    id="fit-min"
                    type="number"
                    min="0"
                    max="100"
                    value={minFitScore}
                    onChange={(event) => setMinFitScore(event.target.value)}
                    placeholder="Min"
                  />
                  <Input
                    aria-label="Maximum fit score"
                    type="number"
                    min="0"
                    max="100"
                    value={maxFitScore}
                    onChange={(event) => setMaxFitScore(event.target.value)}
                    placeholder="Max"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="scorecard-min">Minimum scorecard average</Label>
                <Input
                  id="scorecard-min"
                  type="number"
                  min="1"
                  max="5"
                  step="0.1"
                  value={minScorecardAverage}
                  onChange={(event) =>
                    setMinScorecardAverage(event.target.value)
                  }
                  placeholder="1.0–5.0"
                  className="mt-1"
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={clearFilters}
                  disabled={!filtersActive}
                >
                  Clear filters
                </Button>
              </div>
            </CardContent>
        </Card>

        {candidatesQuery.isLoading && candidates.length === 0 && (
          <div
            className="grid gap-4 md:grid-cols-2"
            aria-label="Loading candidates"
          >
            {[0, 1, 2, 3].map((item) => (
              <Skeleton key={item} className="h-64 rounded-lg" />
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
                {candidates.length === 0 && !filtersActive
                  ? "No candidates yet"
                  : "No candidates match your filters"}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {candidates.length === 0 && !filtersActive
                  ? "Submitted applications will add candidates to this list."
                  : "Try broadening or clearing your filters."}
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
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-lg font-semibold">
                          {candidate.user.name}
                        </h2>
                        {candidate.poolEntry && (
                          <Badge variant="success">
                            <Star className="mr-1 h-3 w-3" aria-hidden="true" />
                            In talent pool
                          </Badge>
                        )}
                      </div>
                      <a
                        href={"mailto:" + candidate.user.email}
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

                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    <Badge variant="outline">
                      {candidate.metrics?.applicationCount ??
                        candidate.applicationInsights?.length ??
                        0}{" "}
                      applications
                    </Badge>
                    {candidate.metrics?.bestFitScore != null && (
                      <Badge variant="secondary">
                        <Sparkles className="mr-1 h-3 w-3" aria-hidden="true" />
                        Best fit {candidate.metrics.bestFitScore}%
                      </Badge>
                    )}
                    {candidate.metrics?.scorecardAverage != null && (
                      <Badge variant="secondary">
                        Scorecard{" "}
                        {candidate.metrics.scorecardAverage.toFixed(1)}/5
                      </Badge>
                    )}
                  </div>

                  {(candidate.poolEntry?.tags.length ?? 0) > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {candidate.poolEntry?.tags.map((tag) => (
                        <Badge key={tag.id} variant="muted">
                          {tag.label}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="mt-auto flex flex-wrap gap-2 pt-5">
                    <Link
                      to={"/recruiter/candidates/" + candidate.id}
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
                          buttonVariants({
                            variant: "secondary",
                            size: "sm",
                          }),
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
