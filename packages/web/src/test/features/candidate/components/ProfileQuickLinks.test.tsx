import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProfileQuickLinks } from "@/features/candidate/components/ProfileQuickLinks";
import { ProfileSection } from "@/features/candidate/components/ProfileSection";

const scrollIntoView = vi.fn();

// jsdom implements neither of these; the drawer degrades to plain navigation
// without the observer, and needs the stub to scroll at all.
beforeEach(() => {
  vi.clearAllMocks();
  Element.prototype.scrollIntoView = scrollIntoView;
});

function renderPage(options: { withAbout?: boolean } = {}) {
  const { withAbout = true } = options;

  return render(
    <div>
      <ProfileQuickLinks />
      {withAbout && (
        <ProfileSection title="About">
          <p>Bio</p>
        </ProfileSection>
      )}
      <ProfileSection title="Experience">
        <p>Roles</p>
      </ProfileSection>
    </div>,
  );
}

describe("ProfileQuickLinks", () => {
  it("opens the drawer and lists the sections that are on the page", async () => {
    const user = userEvent.setup();
    renderPage();

    const toggle = screen.getByRole("button", { name: "Open profile sections" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    const drawer = screen.getByRole("navigation", { name: "Profile sections" });
    expect(drawer).toHaveClass("translate-x-0");
    expect(screen.getByRole("button", { name: "About" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Experience" })).toBeInTheDocument();
  });

  it("offers no link to a section that did not render", async () => {
    const user = userEvent.setup();
    renderPage({ withAbout: false });

    await user.click(screen.getByRole("button", { name: "Open profile sections" }));

    expect(screen.queryByRole("button", { name: "About" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Experience" })).toBeInTheDocument();
  });

  it("scrolls to the chosen section and closes", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Open profile sections" }));
    await user.click(screen.getByRole("button", { name: "Experience" }));

    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "start",
    });
    expect(
      screen.getByRole("navigation", { name: "Profile sections" }),
    ).toHaveClass("-translate-x-full");
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Open profile sections" }));
    await user.keyboard("{Escape}");

    expect(
      screen.getByRole("navigation", { name: "Profile sections" }),
    ).toHaveClass("-translate-x-full");
  });

  it("keeps the closed drawer's controls out of the tab order", () => {
    renderPage();

    expect(screen.getByRole("button", { name: "Experience" })).toHaveAttribute(
      "tabindex",
      "-1",
    );
  });
});
