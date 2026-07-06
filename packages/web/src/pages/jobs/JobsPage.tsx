import { useMemo, useState } from "react";
import { ArrowDownWideNarrow, Search } from "lucide-react";
import { JobCard } from "../../components/jobs/JobCard";
import { JobFilters, type StatusFilter } from "../../components/jobs/JobFilters";
import {
  RoleSwitcher,
} from "../../components/jobs/RoleSwitcher";
import { mockJobs, stackFilters } from "../../data/jobs";
import type { PlatformRole } from "../../types/users";

export function JobsPage() {
  const [selectedRole, setSelectedRole] = useState<PlatformRole>("candidate");
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>("open");
  const [selectedStack, setSelectedStack] = useState<string>("All stacks");

  const openRolesCount = mockJobs.filter((job) => job.status === "open").length;

  const visibleJobs = useMemo(() => {
    return mockJobs.filter((job) => {
      const statusMatches =
        selectedStatus === "all" || job.status === selectedStatus;
      const stackMatches =
        selectedStack === "All stacks" || job.skills.includes(selectedStack);

      return statusMatches && stackMatches;
    });
  }, [selectedStack, selectedStatus]);

  return (
    <div className="bg-muted/30">
      <section className="border-b bg-background">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-10 sm:px-6 md:py-14 lg:grid-cols-[minmax(0,1fr)_420px] lg:px-8">
          <div className="flex flex-col justify-center">
            <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-md border bg-card px-3 py-1 text-sm font-medium text-muted-foreground">
              <Search className="h-4 w-4" aria-hidden="true" />
              {openRolesCount} open roles this week
            </div>
            <h1 className="max-w-3xl text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
              Find a team where you'll actually thrive.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              Open roles at thoughtful, small tech companies. Hand-picked,
              clearly written, and respectful of your time.
            </p>
          </div>

          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <p className="mb-3 text-sm font-medium text-muted-foreground">
              View Hireflow as
            </p>
            <RoleSwitcher
              value={selectedRole}
              onChange={setSelectedRole}
              compact
            />
            <p className="mt-4 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
              {selectedRole === "candidate"
                ? "Browse roles with clear salary, stack, and location context."
                : selectedRole === "recruiter"
                  ? "Preview how open roles appear to candidates."
                  : "Review role expectations before structured interviews."}
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 space-y-5">
          <JobFilters
            selectedStatus={selectedStatus}
            selectedStack={selectedStack}
            stacks={stackFilters}
            onStatusChange={setSelectedStatus}
            onStackChange={setSelectedStack}
          />

          <div className="flex flex-col gap-2 border-t pt-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold">
                {visibleJobs.length} {visibleJobs.length === 1 ? "role" : "roles"}
              </h2>
              <p className="text-sm text-muted-foreground">
                Matching {selectedStatus === "all" ? "all statuses" : selectedStatus}{" "}
                and {selectedStack.toLowerCase()}.
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ArrowDownWideNarrow className="h-4 w-4" aria-hidden="true" />
              Sorted by most recent
            </div>
          </div>
        </div>

        {visibleJobs.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border bg-card px-6 py-12 text-center">
            <h3 className="text-lg font-semibold">No roles match these filters</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Try another status or stack to widen the list.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
