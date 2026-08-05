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
import type { JobSummary } from "../../types/jobs";

interface JobCardProps {
  job: JobSummary;
  /**
   * The careers page renders these cards too, where linking the company name
   * would just point at the page you are already on.
   */
  linkCompany?: boolean;
}

export function JobCard({ job, linkCompany = true }: JobCardProps) {
  return (
    <Card className="flex h-full flex-col transition-colors hover:border-slate-300">
      <CardHeader className="space-y-4 p-5">
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
            <CardTitle className="text-xl leading-7">
              <Link
                to={`/jobs/${job.id}`}
                className="rounded-sm outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {job.title}
              </Link>
            </CardTitle>
          </div>
          <Badge variant="success">Open</Badge>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-5 px-5 pb-5 pt-0">
        <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
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
          <span className="flex items-center gap-2 sm:col-span-2">
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
              <Badge key={skill} variant="outline">
                {skill}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="mt-auto justify-between gap-3 px-5 pb-5 pt-0">
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
