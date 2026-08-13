import { Menu } from "lucide-react";
import { useLocation } from "react-router-dom";
import { findActiveRecruiterNavItem } from "../../lib/recruiter-nav";
import { NotificationBell } from "./NotificationBell";
import { RecruiterAccountMenu } from "./RecruiterAccountMenu";
import { ThemeToggle } from "../theme/ThemeToggle";

/**
 * Slim top bar for the recruiter shell: page context on the left (plus the
 * mobile hamburger), utility icons on the right. Once navigation moved into
 * the sidebar, this is the bar's only job — every recruiter page still has
 * its own <h1>, so this is a lightweight "where am I" anchor, not a second
 * copy of page content.
 */
export function RecruiterTopBar({
  onOpenMobile,
}: {
  onOpenMobile: () => void;
}) {
  const { pathname } = useLocation();
  const activeItem = findActiveRecruiterNavItem(pathname);

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-4 border-b bg-background/95 px-4 backdrop-blur sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobile}
          aria-label="Open navigation"
          aria-controls="recruiter-sidebar"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-background text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:hidden"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
        <h1 className="truncate text-lg font-semibold">
          {activeItem?.label ?? "Recruiter"}
        </h1>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <ThemeToggle />
        <NotificationBell />
        <RecruiterAccountMenu />
      </div>
    </header>
  );
}
