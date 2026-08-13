import { BriefcaseBusiness, ChevronsLeft, ChevronsRight, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { cn } from "../../lib/utils";
import {
  RECRUITER_NAV_ITEMS,
  isRecruiterNavItemActive,
} from "../../lib/recruiter-nav";
import {
  usePeekRecruiterCandidateCount,
  usePeekRecruiterDashboard,
} from "../../features/recruiter/hooks";
import { ACCENT_RING } from "../../features/candidate/theme";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Non-terminal application stages — what "currently in the pipeline" means
// for the Pipeline nav badge, as opposed to every application ever received.
const ACTIVE_PIPELINE_STAGES = [
  "APPLIED",
  "REVIEWED",
  "INTERVIEWING",
  "OFFER",
] as const;

/**
 * Opportunistic nav-item counts: reads whatever's already cached from a real
 * visit to the Dashboard / Talent pool pages, never fetches on its own. See
 * usePeekRecruiterDashboard / usePeekRecruiterCandidateCount.
 */
function useRecruiterNavBadges(): Record<string, number | undefined> {
  const dashboard = usePeekRecruiterDashboard();
  const candidateCount = usePeekRecruiterCandidateCount();

  const pipelineCount = dashboard
    ? ACTIVE_PIPELINE_STAGES.reduce(
        (sum, stage) => sum + (dashboard.stageCounts[stage] ?? 0),
        0,
      )
    : undefined;

  return {
    "/recruiter/jobs": dashboard?.metrics.openJobs,
    "/recruiter/pipeline": pipelineCount,
    "/recruiter/candidates": candidateCount,
  };
}

interface RecruiterSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function RecruiterSidebar({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}: RecruiterSidebarProps) {
  const { pathname } = useLocation();
  const badges = useRecruiterNavBadges();
  const navRef = useRef<HTMLElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Close the mobile drawer automatically on navigation, so it doesn't stay
  // open over the newly-loaded page. Deliberately keyed on `pathname` alone
  // — `onCloseMobile` is a fresh inline closure from the parent on every
  // render, and including it would re-fire this effect (and yank the drawer
  // shut) on any unrelated re-render while it's open, not just on an actual
  // route change.
  useEffect(() => {
    onCloseMobile();
  }, [pathname]);

  // Escape-to-close, scoped to while the drawer is actually open.
  useEffect(() => {
    if (!mobileOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCloseMobile();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen, onCloseMobile]);

  // Focus trap + restore: capture what had focus before opening, move focus
  // into the drawer, cycle Tab/Shift+Tab within it, and hand focus back to
  // the trigger (or whatever else had it) on close. ProfileQuickLinks — the
  // pattern this drawer otherwise follows — doesn't implement this; it's new
  // here because the sidebar spec calls for real trapping, not just an
  // out-of-tab-order closed panel.
  useEffect(() => {
    if (mobileOpen) {
      previouslyFocused.current = document.activeElement as HTMLElement | null;
      const container = navRef.current;
      const first = container?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      first?.focus();

      function onKeyDown(event: KeyboardEvent) {
        if (event.key !== "Tab" || !container) return;
        const focusable = Array.from(
          container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
        );
        if (focusable.length === 0) return;

        const currentIndex = focusable.indexOf(
          document.activeElement as HTMLElement,
        );

        if (event.shiftKey && currentIndex <= 0) {
          event.preventDefault();
          focusable[focusable.length - 1].focus();
        } else if (!event.shiftKey && currentIndex === focusable.length - 1) {
          event.preventDefault();
          focusable[0].focus();
        }
      }

      window.addEventListener("keydown", onKeyDown);
      return () => window.removeEventListener("keydown", onKeyDown);
    }

    previouslyFocused.current?.focus();
    previouslyFocused.current = null;
    return undefined;
  }, [mobileOpen]);

  return (
    <>
      {/* Backdrop — mobile only; the desktop rail is never an overlay. */}
      <div
        aria-hidden="true"
        onClick={onCloseMobile}
        className={cn(
          "fixed inset-0 z-40 bg-stone-900/40 transition-opacity duration-200 lg:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      <aside
        ref={navRef}
        id="recruiter-sidebar"
        aria-label="Recruiter navigation"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-background transition-transform duration-200 ease-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          "lg:sticky lg:top-0 lg:z-30 lg:h-screen lg:translate-x-0 lg:transition-[width] lg:duration-200",
          collapsed ? "lg:w-20" : "lg:w-64",
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b px-4">
          <Link
            to="/recruiter/dashboard"
            className={cn(
              "flex min-w-0 items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2",
              ACCENT_RING,
            )}
          >
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-950 text-white"
              aria-hidden="true"
            >
              <BriefcaseBusiness className="h-4 w-4" />
            </span>
            {!collapsed && (
              <span className="truncate text-base font-semibold lg:inline">
                HireFlow
              </span>
            )}
          </Link>
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation"
            className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground lg:hidden"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Primary">
          {RECRUITER_NAV_ITEMS.map((item) => {
            const isActive = isRecruiterNavItemActive(pathname, item.to);
            const badge = badges[item.to];
            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                aria-label={item.label}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2",
                  ACCENT_RING,
                  isActive
                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                {!collapsed && (
                  <>
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {badge !== undefined && (
                      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
                        {badge}
                      </span>
                    )}
                  </>
                )}
                {/* Collapsed-rail tooltip: icons stay individually labeled
                    (aria-label/title above) — this is the visible affordance
                    for a sighted mouse user. */}
                {collapsed && (
                  <span
                    role="tooltip"
                    className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md border bg-background px-2 py-1 text-xs font-medium text-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100"
                  >
                    {item.label}
                    {badge !== undefined ? ` · ${badge}` : ""}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t p-3">
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "hidden w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 lg:flex",
              ACCENT_RING,
            )}
          >
            {collapsed ? (
              <ChevronsRight className="h-4 w-4" aria-hidden="true" />
            ) : (
              <>
                <ChevronsLeft className="h-4 w-4" aria-hidden="true" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
