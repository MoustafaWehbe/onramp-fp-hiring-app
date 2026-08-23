import {
  Briefcase,
  Building2,
  CalendarDays,
  ClipboardList,
  Kanban,
  LayoutDashboard,
  FileChartColumn,
  Settings as SettingsIcon,
  Users,
  type LucideIcon,
} from "lucide-react";
import { getRoleNavItems, type RoleNavItem } from "./roles";

export interface RecruiterNavItem extends RoleNavItem {
  icon: LucideIcon;
}

/**
 * One icon per recruiter destination. Kept here (not in lib/roles.ts, which
 * has no UI-library dependency) so the route/label data stays reusable
 * outside the sidebar.
 */
const RECRUITER_NAV_ICONS: Record<string, LucideIcon> = {
  "/recruiter/dashboard": LayoutDashboard,
  "/recruiter/reports": FileChartColumn,
  "/recruiter/jobs": Briefcase,
  "/recruiter/pipeline": Kanban,
  "/recruiter/candidates": Users,
  "/recruiter/calendar": CalendarDays,
  "/recruiter/scorecard-templates": ClipboardList,
  "/recruiter/company/create": Building2,
  "/recruiter/settings": SettingsIcon,
};

/**
 * The sidebar's nav list — reuses roleConfig.recruiter.navItems (the single
 * source of truth for recruiter routes/labels, also used by Header for the
 * rare case of a recruiter browsing a public page) rather than a second,
 * parallel list that could drift.
 */
export const RECRUITER_NAV_ITEMS: RecruiterNavItem[] = getRoleNavItems(
  "recruiter",
).map((item) => ({
  ...item,
  icon: RECRUITER_NAV_ICONS[item.to] ?? LayoutDashboard,
}));

/**
 * True when `pathname` is the nav item's own route or a route nested under
 * it — e.g. /recruiter/pipeline/:jobId keeps "Pipeline" active,
 * /recruiter/jobs/:id/edit keeps "Jobs" active. Pure function of the
 * pathname, so it's correct on first paint after a hard refresh with no
 * client-only state to rehydrate.
 */
export function isRecruiterNavItemActive(
  pathname: string,
  to: string,
): boolean {
  return pathname === to || pathname.startsWith(`${to}/`);
}

/** The active item, if any — shared by the sidebar (highlight) and the top bar (page title) so the two can't disagree. */
export function findActiveRecruiterNavItem(
  pathname: string,
): RecruiterNavItem | undefined {
  return RECRUITER_NAV_ITEMS.find((item) =>
    isRecruiterNavItemActive(pathname, item.to),
  );
}
