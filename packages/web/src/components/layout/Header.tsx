import { BriefcaseBusiness, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { buttonVariants } from "../ui/button";
import { cn } from "../../lib/utils";
import { getRoleHomePath } from "../../data/users";
import type { PlatformRole } from "../../types/users";

interface NavItem {
  to: string;
  label: string;
}

const publicNavItems: NavItem[] = [
  { to: "/", label: "Home" },
  { to: "/jobs", label: "Jobs" },
];

const roleNavItems: Record<PlatformRole, NavItem[]> = {
  candidate: [
    { to: "/candidate", label: "Home" },
    { to: "/jobs", label: "Jobs" },
    { to: "/applications", label: "My applications" },
    { to: "/profile", label: "Profile" },
  ],
  recruiter: [
    { to: "/recruiter/dashboard", label: "Dashboard" },
    { to: "/recruiter/pipeline", label: "Pipeline" },
    { to: "/recruiter/jobs", label: "Jobs" },
  ],
  interviewer: [
    { to: "/interviewer", label: "Home" },
    { to: "/interviewer/pipeline", label: "Pipeline" },
    { to: "/interviewer/schedule", label: "Schedule" },
  ],
};

export function Header() {
  const { user, currentRole, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const navItems = currentRole ? roleNavItems[currentRole] : publicNavItems;
  const homePath = currentRole ? getRoleHomePath(currentRole) : "/";

  async function handleLogout(): Promise<void> {
    await logout();
    setIsOpen(false);
    navigate("/");
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          to={homePath}
          className="flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          onClick={() => setIsOpen(false)}
        >
          <span
            className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-950 text-white"
            aria-hidden="true"
          >
            <BriefcaseBusiness className="h-4 w-4" />
          </span>
          <span className="text-lg font-semibold">Hireflow</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/" || item.to === "/candidate" || item.to === "/interviewer"}
              className={({ isActive }) =>
                cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {user && currentRole ? (
            <>
              <span className="rounded-md text-sm font-medium text-muted-foreground">
                {user.name}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-2")}
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Logout
              </button>
            </>
          ) : (
            <Link to="/login" className={buttonVariants({ size: "sm" })}>
              Sign in
            </Link>
          )}
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border bg-background text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:hidden"
          aria-label={isOpen ? "Close menu" : "Open menu"}
          aria-expanded={isOpen}
          onClick={() => setIsOpen((current) => !current)}
        >
          {isOpen ? (
            <X className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Menu className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
      </div>

      {isOpen && (
        <div className="border-t bg-background md:hidden">
          <nav
            className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3"
            aria-label="Mobile primary"
          >
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/" || item.to === "/candidate" || item.to === "/interviewer"}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
            {user && currentRole ? (
              <button
                type="button"
                onClick={handleLogout}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "mt-2 gap-2",
                )}
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Logout
              </button>
            ) : (
              <Link
                to="/login"
                onClick={() => setIsOpen(false)}
                className={cn(buttonVariants({ size: "sm" }), "mt-2")}
              >
                Sign in
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
