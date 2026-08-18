import { ChevronDown, LogOut } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { getRoleLabel } from "../../lib/roles";
import { cn } from "../../lib/utils";
import { ACCENT_GRADIENT } from "../../features/candidate/theme";

/**
 * Profile/account menu for the recruiter top bar — a hand-rolled popover
 * (open state + outside-click + Escape), matching NotificationBell's
 * existing pattern rather than introducing a new one (no Radix/shadcn
 * dropdown is installed).
 */
export function RecruiterAccountMenu() {
  const { user, currentRole, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: MouseEvent): void {
      if (!panelRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  async function handleLogout(): Promise<void> {
    await logout();
    setIsOpen(false);
    navigate("/");
  }

  if (!user || !currentRole) {
    return null;
  }

  const initial = user.name.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-label="Account menu"
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white",
            ACCENT_GRADIENT,
          )}
          aria-hidden="true"
        >
          {initial}
        </span>
        <span className="hidden max-w-[10rem] truncate text-sm font-medium sm:inline">
          {user.name}
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label="Account"
          className="absolute right-0 z-50 mt-2 w-64 rounded-md border bg-background shadow-lg"
        >
          <div className="border-b px-4 py-3">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {user.email}
            </p>
            <span className="mt-2 inline-flex rounded-full border bg-muted px-2 py-0.5 text-xs font-medium">
              {getRoleLabel(currentRole)}
            </span>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => void handleLogout()}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
