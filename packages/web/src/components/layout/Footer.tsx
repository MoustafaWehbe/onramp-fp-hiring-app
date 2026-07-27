import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { getRoleHomePath, getRoleNavItems } from "../../lib/roles";

export function Footer() {
  const { currentRole } = useAuth();
  const links = currentRole
    ? getRoleNavItems(currentRole).filter(
        ({ to }) => to !== getRoleHomePath(currentRole),
      )
    : [{ to: "/jobs", label: "Jobs" }];

  return (
    <footer className="border-t bg-card/50">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p>HireFlow helps thoughtful teams and candidates meet clearly.</p>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {links.map(({ to, label }) => (
            <Link key={to} className="hover:text-foreground" to={to}>
              {label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
