import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RecruiterSettingsPage } from "@/pages/recruiter/RecruiterSettingsPage";

const { useCalendarConnection, useDisconnectCalendar } = vi.hoisted(() => ({
  useCalendarConnection: vi.fn(),
  useDisconnectCalendar: vi.fn(),
}));

vi.mock("@/features/calendar/hooks", () => ({
  useCalendarConnection: () => useCalendarConnection(),
  useDisconnectCalendar: () => useDisconnectCalendar(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  useDisconnectCalendar.mockReturnValue({ mutate: vi.fn(), isPending: false });
  useCalendarConnection.mockReturnValue({
    data: {
      configured: true,
      connected: false,
      googleEmail: null,
      connectedAt: null,
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  });
});

describe("RecruiterSettingsPage", () => {
  it("offers the separate Calendar consent flow when configured", () => {
    render(
      <MemoryRouter>
        <RecruiterSettingsPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("link", { name: /Connect Google Calendar/ }),
    ).toHaveAttribute("href", "/api/recruiter/calendar/connect");
    expect(screen.getByText(/separate Calendar consent/)).toBeInTheDocument();
  });

  it("shows the connected Google account", () => {
    useCalendarConnection.mockReturnValue({
      data: {
        configured: true,
        connected: true,
        googleEmail: "owner@example.com",
        connectedAt: "2026-08-07T10:00:00.000Z",
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/recruiter/settings?calendar=connected"]}>
        <RecruiterSettingsPage />
      </MemoryRouter>,
    );
    expect(screen.getByText("owner@example.com")).toBeInTheDocument();
    expect(screen.getByText(/connected successfully/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Disconnect/ })).toBeInTheDocument();
  });

  it("explains when deployment configuration is missing", () => {
    useCalendarConnection.mockReturnValue({
      data: {
        configured: false,
        connected: false,
        googleEmail: null,
        connectedAt: null,
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(
      <MemoryRouter>
        <RecruiterSettingsPage />
      </MemoryRouter>,
    );
    expect(screen.getByText(/administrator must configure/)).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Connect Google Calendar/ }),
    ).not.toBeInTheDocument();
  });
});
