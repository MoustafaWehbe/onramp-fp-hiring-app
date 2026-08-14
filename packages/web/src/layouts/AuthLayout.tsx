import { ArrowLeft, BriefcaseBusiness } from "lucide-react";
import { Link, Outlet } from "react-router-dom";
import { RouteTransition } from "../components/shared/RouteTransition";

export function AuthLayout() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-stone-50 dark:bg-stone-950">
      {/* Subtle branded backdrop: a soft indigo/violet wash with two blurred
          accent shapes, CSS-only — no illustration asset. Decorative, so it
          sits behind everything and never intercepts pointer events. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -left-24 -top-32 h-80 w-80 rounded-full bg-gradient-to-br from-indigo-400/30 to-violet-400/20 blur-3xl dark:from-indigo-500/20 dark:to-violet-500/10" />
        <div className="absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-gradient-to-br from-violet-400/25 to-indigo-400/15 blur-3xl dark:from-violet-500/15 dark:to-indigo-500/10" />
      </div>

      <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
        <div className="mb-8 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <span
              className="flex h-10 w-10 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-sm dark:from-indigo-400 dark:to-violet-400"
              aria-hidden="true"
            >
              <BriefcaseBusiness className="h-5 w-5" />
            </span>
            <span className="text-2xl font-bold text-stone-900 dark:text-stone-100">
              HireFlow
            </span>
          </Link>
          <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
            One structured hiring workspace for candidates, recruiters, and
            interviewers.
          </p>
        </div>
        <RouteTransition>
          <Outlet />
        </RouteTransition>
        <div className="mt-6 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-stone-500 transition-colors hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
