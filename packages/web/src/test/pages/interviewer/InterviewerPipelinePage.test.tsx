import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InterviewerPipelinePage } from "@/pages/interviewer/InterviewerPipelinePage";
import type { InterviewerAssignment } from "@/types/interviewer";

const { useInterviewerAssignments } = vi.hoisted(() => ({
  useInterviewerAssignments: vi.fn(),
}));

vi.mock("@/features/interviewer/hooks", () => ({
  useInterviewerAssignments: () => useInterviewerAssignments(),
}));

const assignment: InterviewerAssignment = {
  id: "assignment-1",
  createdAt: "2026-07-27T10:00:00.000Z",
  application: {
    id: "application-1",
    stage: "INTERVIEWING",
    submittedAt: "2026-07-20T10:00:00.000Z",
    coverLetter: "I enjoy building dependable platforms.",
    resumeUrl: null,
    resumeOriginalFilename: "Amara_Okafor_Resume.pdf",
    resumeDownloadUrl: "/api/applications/application-1/resume",
    job: {
      id: "job-1",
      title: "Platform Engineer",
      location: "Remote",
      status: "OPEN",
    },
    candidateProfile: {
      id: "profile-1",
      headline: "Senior platform engineer",
      location: "Lagos",
      resumeUrl: "https://example.com/resume.pdf",
      user: {
        id: "candidate-1",
        name: "Amara Okafor",
        email: "amara.okafor@example.com",
      },
    },
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  useInterviewerAssignments.mockReturnValue({
    data: [assignment],
    error: null,
    isError: false,
    isLoading: false,
    isSuccess: true,
    refetch: vi.fn(),
  });
});

describe("InterviewerPipelinePage", () => {
  it("renders only API-backed assignment actions and candidate context", () => {
    render(<InterviewerPipelinePage />);

    expect(screen.getByText("Amara Okafor")).toBeInTheDocument();
    expect(screen.getByText("Platform Engineer")).toBeInTheDocument();
    expect(
      screen.getByText("I enjoy building dependable platforms."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Amara_Okafor_Resume.pdf" }),
    ).toHaveAttribute("href", "/api/applications/application-1/resume");
    expect(
      screen.getByRole("link", { name: "Amara_Okafor_Resume.pdf" }),
    ).toHaveAttribute("download", "Amara_Okafor_Resume.pdf");
    expect(
      screen.queryByRole("button", { name: /notes|feedback/i }),
    ).not.toBeInTheDocument();
  });

  it("uses a safe filename for an assigned legacy application CV", () => {
    useInterviewerAssignments.mockReturnValue({
      data: [
        {
          ...assignment,
          application: {
            ...assignment.application,
            resumeOriginalFilename: null,
          },
        },
      ],
      error: null,
      isError: false,
      isLoading: false,
      isSuccess: true,
      refetch: vi.fn(),
    });

    render(<InterviewerPipelinePage />);

    expect(screen.getByRole("link", { name: "resume.pdf" })).toHaveAttribute(
      "href",
      "/api/applications/application-1/resume",
    );
  });
});
