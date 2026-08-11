import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RecruiterCalendarPage } from "@/pages/recruiter/RecruiterCalendarPage";

const { useRecruiterCalendar } = vi.hoisted(() => ({
  useRecruiterCalendar: vi.fn(),
}));

vi.mock("@/features/calendar/hooks", () => ({
  useRecruiterCalendar: () => useRecruiterCalendar(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  useRecruiterCalendar.mockReturnValue({
    data: [
      {
        applicationId: "application-1",
        interviewDate: "2030-08-10T14:00:00.000Z",
        googleMeetLink: "https://meet.google.com/abc-defg-hij",
        calendarSyncStatus: "synced",
        job: { id: "job-1", title: "Senior Platform Engineer" },
        candidate: {
          id: "candidate-1",
          name: "Amara Okafor",
          email: "amara@example.com",
        },
      },
      {
        applicationId: "application-2",
        interviewDate: "2030-08-11T15:00:00.000Z",
        googleMeetLink: null,
        calendarSyncStatus: "failed",
        job: { id: "job-2", title: "Product Engineer" },
        candidate: {
          id: "candidate-2",
          name: "Jordan Lee",
          email: "jordan@example.com",
        },
      },
    ],
    isLoading: false,
    isError: false,
    isSuccess: true,
    refetch: vi.fn(),
  });
});

describe("RecruiterCalendarPage", () => {
  it("renders company interviews with candidate, job, sync state, and Meet link", () => {
    render(
      <MemoryRouter>
        <RecruiterCalendarPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("Amara Okafor")).toHaveAttribute(
      "href",
      "/recruiter/candidates/candidate-1",
    );
    expect(screen.getByText("Senior Platform Engineer")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Join Meet/ })).toHaveAttribute(
      "href",
      "https://meet.google.com/abc-defg-hij",
    );
    expect(screen.getByText("Calendar sync failed")).toBeInTheDocument();
    expect(screen.getByText("No Meet link")).toBeInTheDocument();
  });

  it("shows an empty state when nothing is scheduled", () => {
    useRecruiterCalendar.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      isSuccess: true,
      refetch: vi.fn(),
    });

    render(
      <MemoryRouter>
        <RecruiterCalendarPage />
      </MemoryRouter>,
    );
    expect(screen.getByText("No upcoming interviews")).toBeInTheDocument();
  });
});
