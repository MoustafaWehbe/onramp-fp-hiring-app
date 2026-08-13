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
 */
export function RecruiterLayout() {
  const [collapsed, toggleCollapsed] = useSidebarCollapsed();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full flex-col bg-background lg:flex-row">
      <RecruiterSidebar
        collapsed={collapsed}
        onToggleCollapse={toggleCollapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <RecruiterTopBar onOpenMobile={() => setMobileOpen(true)} />
        <main className="flex-1">
          <RouteTransition>
            <Outlet />
          </RouteTransition>
        </main>
      </div>
    </div>
  );
}
