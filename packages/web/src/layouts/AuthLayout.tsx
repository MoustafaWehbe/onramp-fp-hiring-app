import { ArrowLeft, BriefcaseBusiness } from "lucide-react";
import { Link, Outlet } from "react-router-dom";

export function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
        <div className="mb-8 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <span
              className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-950 text-white"
              aria-hidden="true"
            >
              <BriefcaseBusiness className="h-5 w-5" />
            </span>
            <span className="text-2xl font-bold">HireFlow</span>
          </Link>
          <p className="mt-2 text-sm text-muted-foreground">
            One structured hiring workspace for candidates, recruiters, and
            interviewers.
          </p>
        </div>
        <Outlet />
        <div className="mt-6 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
