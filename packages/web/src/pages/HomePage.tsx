import {
  Activity,
  ArrowRight,
  BriefcaseBusiness,
  CalendarClock,
  ClipboardCheck,
  Layers,
  ListChecks,
  ShieldCheck,
  Sparkles,
  UserSearch,
  Users,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { JobCard } from "../components/jobs/JobCard";
import { RoleSwitcher } from "../components/jobs/RoleSwitcher";
import { roleIcons } from "../components/auth/RolePicker";
import { buttonVariants } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { mockJobs } from "../data/jobs";
import { useAuth } from "../hooks/useAuth";
import { getRoleHomePath, PLATFORM_ROLES, roleConfig } from "../lib/roles";
import { cn } from "../lib/utils";
import type { PlatformRole } from "../types/users";

const interviewerHighlights = [
  {
    icon: CalendarClock,
    title: "Upcoming interviews",
    description:
      "See every scheduled session with role, stage, and timing in one calm list.",
  },
  {
    icon: UserSearch,
    title: "Candidate context",
    description:
      "Walk in prepared with the resume, role expectations, and prior feedback.",
  },
  {
    icon: ClipboardCheck,
    title: "Feedback status",
    description:
      "Know exactly which reviews are submitted, drafted, or still waiting on you.",
  },
  {
    icon: ListChecks,
    title: "Scorecard-ready reviews",
    description:
      "Structured prompts turn your notes into consistent, comparable scorecards.",
  },
];

const recruiterHighlights = [
  {
    icon: BriefcaseBusiness,
    title: "Active jobs",
    description:
      "Every open role with applicant counts and stage health at a glance.",
  },
  {
    icon: Users,
    title: "Candidate pipeline",
    description:
      "Move candidates through a clear hiring pipeline without spreadsheet chaos.",
  },
  {
    icon: Layers,
    title: "Review stages",
    description:
      "Screens, interviews, and offers stay organized in explicit, visible stages.",
  },
  {
    icon: Activity,
    title: "Hiring signals",
    description:
      "Spot stalled candidates and slow stages before they cost you a great hire.",
  },
];

export function HomePage() {
  const navigate = useNavigate();
  const {
    user,
    currentRole,
    intendedRole,
    isDemoSession,
    loginAsDemoUser,
    setIntendedRole,
  } = useAuth();

  function continueAsRole(role: PlatformRole): void {
    // Already working in this role — go straight to the workspace.
    if (user && currentRole === role) {
      navigate(getRoleHomePath(role));
      return;
    }

    // Demo sessions can switch workspace instantly (frontend-only testing).
    if (user && isDemoSession) {
      loginAsDemoUser(role);
      navigate(getRoleHomePath(role));
      return;
    }

    setIntendedRole(role);
    navigate(`/register?role=${role}`);
  }

  return (
    <div className="bg-muted/30">
      {/* Hero */}
      <section className="border-b bg-background" aria-labelledby="hero-heading">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-12 sm:px-6 md:py-20 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-center lg:px-8">
          <div className="flex flex-col justify-center">
            <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border bg-card px-3 py-1 text-sm font-medium text-muted-foreground">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              HireFlow hiring workspace
            </div>
            <h1
              id="hero-heading"
              className="max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl"
            >
              Hire smarter. Apply faster. Interview with clarity.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              HireFlow connects candidates, recruiters, and interviewers in one
              structured hiring workspace.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/register"
                className={cn(buttonVariants({ size: "lg" }), "gap-2")}
              >
                Get started
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                to="/jobs"
                className={buttonVariants({ variant: "outline", size: "lg" })}
              >
                Browse open roles
              </Link>
            </div>
            <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
              Free to explore — public job listings need no account.
            </p>
          </div>

          {/* Early role selection */}
          <Card>
            <CardContent className="p-5">
              <p className="text-sm font-semibold">Choose your workspace</p>
              <p className="mb-4 mt-1 text-sm text-muted-foreground">
                Pick how you'll use HireFlow to get a tailored start.
              </p>
              <div className="grid gap-2">
                {PLATFORM_ROLES.map((role) => {
                  const Icon = roleIcons[role];
                  const { label, tagline } = roleConfig[role];
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => continueAsRole(role)}
                      className={cn(
                        "group flex w-full items-center gap-3 rounded-md border bg-background p-3 text-left transition-colors",
                        "hover:border-slate-300 hover:bg-accent/50",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      )}
                    >
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-card text-muted-foreground transition-colors group-hover:text-primary"
                        aria-hidden="true"
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold">
                          {label}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {tagline}
                        </span>
                      </span>
                      <ArrowRight
                        className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
                        aria-hidden="true"
                      />
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Role selection */}
      <section
        id="choose-role"
        className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 md:py-20 lg:px-8"
        aria-labelledby="roles-heading"
      >
        <div className="mb-8 max-w-2xl">
          <h2 id="roles-heading" className="text-3xl font-bold tracking-tight">
            One platform, three workspaces
          </h2>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            Candidates, recruiters, and interviewers each get pages, navigation,
            and workflows built for their side of hiring.
          </p>
        </div>
        <RoleSwitcher
          value={user ? currentRole : intendedRole}
          onChange={continueAsRole}
          ctaPrefix="Continue as"
        />
      </section>

      {/* Open roles */}
      <section
        className="border-y bg-background"
        aria-labelledby="open-roles-heading"
      >
        <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 md:py-20 lg:px-8">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <h2
                id="open-roles-heading"
                className="text-3xl font-bold tracking-tight"
              >
                Open roles
              </h2>
              <p className="mt-3 text-base leading-7 text-muted-foreground">
                Clearly written roles with salary, stack, and location up front
                — no account required to browse.
              </p>
            </div>
            <Link
              to="/jobs"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "w-full gap-2 sm:w-auto",
              )}
            >
              Browse all jobs
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {mockJobs.slice(0, 3).map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        </div>
      </section>

      {/* Structured interviews */}
      <section
        className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 md:py-20 lg:px-8"
        aria-labelledby="interviews-heading"
      >
        <div className="mb-8 max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            For interviewers
          </p>
          <h2
            id="interviews-heading"
            className="mt-2 text-3xl font-bold tracking-tight"
          >
            Structured interviews
          </h2>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            Prepare with context and submit structured feedback faster — no
            more scrambling five minutes before the call.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {interviewerHighlights.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="flex h-full flex-col rounded-lg border bg-card p-5 shadow-sm"
            >
              <span
                className="mb-4 flex h-10 w-10 items-center justify-center rounded-md border bg-background text-primary"
                aria-hidden="true"
              >
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="text-base font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Recruiting pipeline */}
      <section
        className="border-y bg-background"
        aria-labelledby="pipeline-heading"
      >
        <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 md:py-20 lg:px-8">
          <div className="mb-8 max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">
              For recruiters
            </p>
            <h2
              id="pipeline-heading"
              className="mt-2 text-3xl font-bold tracking-tight"
            >
              Recruiting pipeline
            </h2>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              Move candidates through a clear hiring pipeline and keep every
              stage — from first screen to offer — visible to the whole team.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {recruiterHighlights.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="flex h-full flex-col rounded-lg border bg-card p-5 shadow-sm"
              >
                <span
                  className="mb-4 flex h-10 w-10 items-center justify-center rounded-md border bg-background text-primary"
                  aria-hidden="true"
                >
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="text-base font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section
        className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 md:py-20 lg:px-8"
        aria-labelledby="final-cta-heading"
      >
        <div className="rounded-xl border bg-card px-6 py-10 text-center shadow-sm sm:px-10 md:py-14">
          <h2
            id="final-cta-heading"
            className="text-3xl font-bold tracking-tight"
          >
            Choose your workspace
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-muted-foreground">
            Start where you fit today — you can always explore the other sides
            of HireFlow later.
          </p>
          <div className="mx-auto mt-8 flex max-w-lg flex-col gap-3 sm:flex-row sm:justify-center">
            {PLATFORM_ROLES.map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => continueAsRole(role)}
                className={cn(
                  buttonVariants({
                    variant: role === "candidate" ? "default" : "outline",
                    size: "lg",
                  }),
                  "w-full sm:w-auto",
                )}
              >
                {roleConfig[role].label}
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
