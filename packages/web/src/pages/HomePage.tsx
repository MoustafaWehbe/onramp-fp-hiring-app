import { ArrowRight, BriefcaseBusiness, CheckCircle2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { RoleSwitcher } from "../components/jobs/RoleSwitcher";
import { buttonVariants } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { useAuth } from "../hooks/useAuth";
import { getRoleHomePath } from "../data/users";
import { cn } from "../lib/utils";
import type { PlatformRole } from "../types/users";

export function HomePage() {
  const navigate = useNavigate();
  const { enterAsRole } = useAuth();

  function handleRoleChange(role: PlatformRole): void {
    enterAsRole(role);
    navigate(getRoleHomePath(role));
  }

  return (
    <div className="bg-muted/30">
      <section className="border-b bg-background">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-10 sm:px-6 md:py-16 lg:grid-cols-[minmax(0,1fr)_520px] lg:px-8">
          <div className="flex flex-col justify-center">
            <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-md border bg-card px-3 py-1 text-sm font-medium text-muted-foreground">
              <BriefcaseBusiness className="h-4 w-4" aria-hidden="true" />
              Hireflow hiring workspace
            </div>
            <h1 className="max-w-3xl text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
              One calm place for every hiring role.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              Candidates find clear roles, recruiters manage pipeline signal,
              and interviewers stay prepared with structured feedback.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link to="/login" className={buttonVariants({ size: "lg" })}>
                Sign in
              </Link>
              <Link
                to="/register"
                className={buttonVariants({ variant: "outline", size: "lg" })}
              >
                Create account
              </Link>
            </div>
          </div>

          <Card>
            <CardContent className="p-5">
              <p className="mb-4 text-sm font-medium text-muted-foreground">
                Choose your workspace
              </p>
              <RoleSwitcher value="candidate" onChange={handleRoleChange} />
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-8 sm:px-6 md:grid-cols-3 lg:px-8">
        {[
          "Pick the role that matches your work today.",
          "See navigation and pages tailored to that role.",
          "Connect live backend data when the API endpoints are ready.",
        ].map((item) => (
          <div key={item} className="flex gap-3 rounded-lg border bg-card p-4">
            <CheckCircle2
              className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600"
              aria-hidden="true"
            />
            <p className="text-sm leading-6 text-muted-foreground">{item}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 pb-10 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <div>
          <h2 className="text-2xl font-semibold">Want to browse first?</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Public job listings stay available even before sign in.
          </p>
        </div>
        <button
          type="button"
          className={cn(buttonVariants(), "w-full gap-2 sm:w-auto")}
          onClick={() => navigate("/jobs")}
        >
          Browse open roles
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </section>
    </div>
  );
}
