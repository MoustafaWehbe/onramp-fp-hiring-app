import { Link } from "react-router-dom";
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CalendarRange,
  Laptop,
  MapPin,
  WalletCards,
} from "lucide-react";
import { Badge } from "../ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { buttonVariants } from "../ui/button";
import { cn } from "../../lib/utils";
import {
  employmentTypeLabels,
  formatSalaryRange,
} from "../../lib/job-presentation";
import {
  ACCENT_CHIP,
  CARD_CLASS,
  CARD_HOVER_CLASS,
} from "../../features/candidate/theme";
import type { JobSummary } from "../../types/jobs";

interface JobCardProps {
  job: JobSummary;
  /**
   * The careers page renders these cards too, where linking the company name
   * would just point at the page you are already on.
   */
  linkCompany?: boolean;
  /**
   * Tighter padding/gaps and a single-column meta list instead of the
   * default two-column grid, for contexts that show cards two-up in a
   * narrower column (e.g. the candidate homepage) rather than the wide
   * three-up grids on the Jobs and marketing pages. Content is identical —
   * only spacing and the meta-row layout change.
   */
  compact?: boolean;
}

export function JobCard({
  job,
  linkCompany = true,
  compact = false,
}: JobCardProps) {
  return (
    <Card className={cn(CARD_CLASS, CARD_HOVER_CLASS, "flex h-full flex-col")}>
      <CardHeader className={cn("space-y-3", compact ? "p-4" : "space-y-4 p-5")}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            {job.company && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                {linkCompany && job.companyId ? (
                  <Link
                    to={`/careers/${job.companyId}`}
                    className="truncate rounded-sm outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    aria-label={`View all open roles at ${job.company}`}
                  >
                    {job.company}
                  </Link>
                ) : (
                  <span className="truncate">{job.company}</span>
                )}
              </div>
            )}
            <CardTitle className={compact ? "text-lg leading-6" : "text-xl leading-7"}>
              <Link
                to={`/jobs/${job.id}`}
                className="rounded-sm outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {job.title}
              </Link>
            </CardTitle>
          </div>
          <Badge variant="success" className="rounded-full">Open</Badge>
        </div>
      </CardHeader>

      <CardContent
        className={cn(
          "flex flex-1 flex-col pt-0",
          compact ? "gap-3 px-4 pb-4" : "gap-5 px-5 pb-5",
        )}
      >
        <div
          className={
            compact
              ? "flex flex-col gap-2 text-sm text-muted-foreground"
              : "grid gap-3 text-sm text-muted-foreground sm:grid-cols-2"
          }
        >
          <span className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
            {job.location ?? (job.isRemote ? "Remote" : "Location not specified")}
          </span>
          <span className="flex items-center gap-2">
            <BriefcaseBusiness
              className="h-4 w-4 shrink-0"
              aria-hidden="true"
            />
            {employmentTypeLabels[job.employmentType]}
          </span>
          {job.isRemote && (
            <span className="flex items-center gap-2">
              <Laptop className="h-4 w-4 shrink-0" aria-hidden="true" />
              Remote available
            </span>
          )}
          <span className="flex items-center gap-2">
            <CalendarRange
              className="h-4 w-4 shrink-0"
              aria-hidden="true"
            />
            {job.experienceMin}–{job.experienceMax} years
          </span>
          <span
            className={cn(
              "flex items-center gap-2",
              !compact && "sm:col-span-2",
            )}
          >
            <WalletCards className="h-4 w-4 shrink-0" aria-hidden="true" />
            {formatSalaryRange(job)}
          </span>
        </div>

        {job.skills.length > 0 && (
          <div
            className="flex flex-wrap gap-2"
            aria-label={`${job.title} skills`}
          >
            {job.skills.map((skill) => (
              <Badge
                key={skill}
                variant="outline"
                className={cn("rounded-full px-3 py-1", ACCENT_CHIP)}
              >
                {skill}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter
        className={cn(
          "mt-auto justify-between gap-3 pt-0",
          compact ? "px-4 pb-4" : "px-5 pb-5",
        )}
      >
        <span className="text-xs font-medium text-muted-foreground">
          {job.postedAt}
        </span>
        <Link
          to={`/jobs/${job.id}`}
          className={cn(buttonVariants({ size: "sm" }), "gap-2")}
          aria-label={`View ${job.title} role`}
        >
          View role
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </CardFooter>
    </Card>
  );
}
