import { useCallback, useEffect, useState } from "react";
import { ChevronRight, List, X } from "lucide-react";
import { cn } from "../../../lib/utils";
import {
  ACCENT_GRADIENT,
  ACCENT_HOVER,
  BORDER_SUBTLE,
  TEXT_HEADING,
  TEXT_META,
} from "../theme";

/**
 * In-page navigation for the profile page: a collapsed rail on desktop, a
 * floating button on narrow screens, both opening the same left drawer.
 *
 * Sections are read from the DOM rather than passed in as a list. Every
 * ProfileSection tags itself with data-profile-section, so the drawer offers
 * exactly the sections that rendered — a candidate still filling in the
 * create-profile form has no About card, and doesn't get a link to one. It
 * also means adding a section later needs no change here.
 */

interface SectionLink {
  id: string;
  label: string;
}

const SECTION_SELECTOR = "[data-profile-section]";

function readSections(): SectionLink[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>(SECTION_SELECTOR),
  )
    // Document order is page order, so the drawer list matches what the user
    // scrolls past without hardcoding a sequence.
    .map((element) => ({
      id: element.id,
      label: element.dataset.profileSection ?? "",
    }))
    .filter((section) => section.id !== "" && section.label !== "");
}

export function ProfileQuickLinks() {
  const [isOpen, setIsOpen] = useState(false);
  const [sections, setSections] = useState<SectionLink[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const refresh = useCallback(() => setSections(readSections()), []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Cards reach their loaded state at different times — About only exists once
  // the profile query resolves — so the list is re-read on the way open rather
  // than captured once on mount. Both updates batch into one render, so the
  // panel never paints a stale list.
  function openDrawer() {
    refresh();
    setIsOpen(true);
  }

  useEffect(() => {
    if (!isOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  // Highlights whichever section is currently under the header. Only runs
  // while the drawer is open — there is nothing to highlight otherwise — and
  // is skipped where IntersectionObserver doesn't exist (jsdom), which costs
  // only the highlight, not the navigation.
  useEffect(() => {
    if (!isOpen || sections.length === 0) return;
    if (typeof IntersectionObserver === "undefined") return;

    const intersecting = new Map<string, boolean>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          intersecting.set(entry.target.id, entry.isIntersecting);
        }
        const current = sections.find((section) =>
          intersecting.get(section.id),
        );
        if (current) setActiveId(current.id);
      },
      // Top margin clears the sticky header; the bottom margin narrows the
      // band so the "active" section is the one at the top of the viewport,
      // not merely one of the three that happen to be visible.
      { rootMargin: "-80px 0px -55% 0px", threshold: 0 },
    );

    for (const section of sections) {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    }

    return () => observer.disconnect();
  }, [isOpen, sections]);

  function goToSection(id: string) {
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveId(id);
    // Closing on navigation: on a phone the panel covers the section the user
    // just asked to see, so leaving it open would hide the answer.
    setIsOpen(false);
  }

  if (sections.length === 0) {
    return null;
  }

  return (
    <>
      {/* Desktop: a slim tab on the viewport's left edge. The page content is
          a centred max-w-4xl column, so this sits in the gutter beside it. */}
      <button
        type="button"
        onClick={openDrawer}
        aria-expanded={isOpen}
        aria-controls="profile-quick-links"
        className={cn(
          "fixed left-0 top-1/2 z-30 hidden -translate-y-1/2 flex-col items-center gap-2 rounded-r-xl border border-l-0",
          BORDER_SUBTLE,
          "bg-background py-4 pl-1.5 pr-2",
          TEXT_META,
          "shadow-md transition-colors",
          ACCENT_HOVER,
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 lg:flex",
          isOpen && "pointer-events-none opacity-0",
        )}
      >
        <List className="h-4 w-4" aria-hidden="true" />
        <span className="text-xs font-medium tracking-wide [writing-mode:vertical-rl]">
          Sections
        </span>
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>

      {/* Narrow screens: a floating toggle instead, bottom-left so it stays
          clear of the content column and of any primary action. */}
      <button
        type="button"
        onClick={openDrawer}
        aria-expanded={isOpen}
        aria-controls="profile-quick-links"
        aria-label="Open profile sections"
        className={cn(
          "fixed bottom-6 left-4 z-30 flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg shadow-indigo-500/25 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 lg:hidden",
          ACCENT_GRADIENT,
          isOpen && "pointer-events-none opacity-0",
        )}
      >
        <List className="h-5 w-5" aria-hidden="true" />
      </button>

      {/* One backdrop for both breakpoints: it dims on narrow screens and is
          transparent on desktop, but click-outside-to-close works on both.
          Body scroll is deliberately left alone — locking it would shift the
          layout by the scrollbar width every time the drawer opens. */}
      <div
        aria-hidden="true"
        onClick={() => setIsOpen(false)}
        className={cn(
          "fixed inset-0 z-40 bg-stone-900/40 transition-opacity duration-200 lg:bg-transparent",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      {/* Above the sticky z-40 header, so the drawer isn't tucked under it. */}
      <nav
        id="profile-quick-links"
        aria-label="Profile sections"
        className={cn(
          "fixed left-0 top-0 z-50 flex h-full w-64 max-w-[80vw] flex-col border-r border-stone-200 dark:border-stone-800 bg-background shadow-xl transition-transform duration-200 ease-out",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 px-4 py-4">
          <p className={cn("text-sm font-semibold", TEXT_HEADING)}>Jump to</p>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            tabIndex={isOpen ? 0 : -1}
            aria-label="Close profile sections"
            className={cn(
              "rounded-full p-1.5",
              TEXT_META,
              "transition-colors hover:bg-stone-100 hover:text-stone-900 dark:hover:bg-stone-800 dark:hover:text-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400",
            )}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <ul className="flex-1 space-y-1 overflow-y-auto p-3">
          {sections.map((section) => {
            const isActive = section.id === activeId;
            return (
              <li key={section.id}>
                <button
                  type="button"
                  onClick={() => goToSection(section.id)}
                  // The panel stays mounted while closed so it can slide, so
                  // its controls are taken out of the tab order by hand.
                  tabIndex={isOpen ? 0 : -1}
                  aria-current={isActive ? "true" : undefined}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400",
                    isActive
                     ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                     : "text-stone-600 dark:text-stone-400 hover:bg-stone-100 hover:text-stone-900 dark:hover:bg-stone-800 dark:hover:text-stone-100"
                  )}
                >
                  {section.label}
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500 dark:bg-indigo-400"
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
