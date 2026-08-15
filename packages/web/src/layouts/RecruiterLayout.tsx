import { useState } from "react";
import { Outlet } from "react-router-dom";
import { RecruiterSidebar } from "../components/layout/RecruiterSidebar";
import { RecruiterTopBar } from "../components/layout/RecruiterTopBar";
import { RouteTransition } from "../components/shared/RouteTransition";
import { useSidebarCollapsed } from "../hooks/useSidebarCollapsed";

/**
 * Recruiter-only shell: a persistent left sidebar (collapsible to an icon
 * rail on desktop, an overlay drawer on mobile) plus a slim top bar,
 * replacing the shared top-nav AppLayout for every /recruiter/* route.
 * Candidate/interviewer/public routes still use AppLayout, unchanged.
 *
 * The root is capped to exactly the viewport height with its own overflow
 * hidden, and only the content column scrolls (`overflow-y-auto` below) —
 * so the sidebar never participates in page scroll at all, rather than
 * relying on `position: sticky` chasing a growing page. One scroll
 * container, no double scrollbar.
 */
export function RecruiterLayout() {
  const [collapsed, toggleCollapsed] = useSidebarCollapsed();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background lg:flex-row">
      <RecruiterSidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <RecruiterTopBar
          collapsed={collapsed}
          onToggleCollapse={toggleCollapsed}
          onOpenMobile={() => setMobileOpen(true)}
        />
        <main className="flex-1 bg-muted/30">
          <RouteTransition>
            {/* The one shared content max-width for every recruiter page,
                matching what the dashboard already used. Individual pages
                that need a narrower reading width (a single form/card) add
                their own inner wrapper rather than fighting this one; the
                Kanban pipeline board stays inside it too — its columns
                already scroll horizontally on their own (overflow-x-auto),
                so there's no need to break out of the shared width. */}
            <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
              <Outlet />
            </div>
          </RouteTransition>
        </main>
      </div>
    </div>
  );
}
