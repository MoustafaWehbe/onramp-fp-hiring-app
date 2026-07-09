import { Link } from "react-router-dom";
import { ArrowRight, Building2, Laptop, MapPin, WalletCards } from "lucide-react";
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
import type { Job } from "../../types/jobs";

interface JobCardProps {
  job: Job;
}

export function JobCard({ job }: JobCardProps) {
  return (
    <Card className="flex h-full flex-col transition-colors hover:border-slate-300">
      <CardHeader className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{job.company}</span>
            </div>
            <CardTitle className="text-xl leading-7">
              <Link
                to={`/jobs/${job.id}`}
                className="rounded-sm outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {job.title}
              </Link>
            </CardTitle>
          </div>
          <Badge variant={job.status === "open" ? "success" : "muted"}>
            {job.status === "open" ? "Open" : "Closed"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-5 px-5 pb-5 pt-0">
        <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
          <span className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
            {job.location}
          </span>
          <span className="flex items-center gap-2">
            <Laptop className="h-4 w-4 shrink-0" aria-hidden="true" />
            {job.workMode}
          </span>
          <span className="flex items-center gap-2 sm:col-span-2">
            <WalletCards className="h-4 w-4 shrink-0" aria-hidden="true" />
            {job.salary}
          </span>
        </div>

        <div className="flex flex-wrap gap-2" aria-label={`${job.title} skills`}>
          {job.skills.map((skill) => (
            <Badge key={skill} variant="outline">
              {skill}
            </Badge>
          ))}
        </div>
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
