import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { RecruiterCandidateDetailsPage } from "@/pages/recruiter/RecruiterCandidateDetailsPage";

const useRecruiterCandidate = vi.fn();

vi.mock("@/features/recruiter/hooks", () => ({
  useRecruiterCandidate: (id: string | undefined) =>
    useRecruiterCandidate(id),
}));

describe("RecruiterCandidateDetailsPage", () => {
  it("renders company-scoped application CV download links", () => {
    useRecruiterCandidate.mockReturnValue({
      data: {
        id: "candidate-profile-amara",
        userId: "candidate-amara",
        headline: "Platform engineer",
        bio: "Builds reliable systems.",
        phone: null,
        location: "Lagos, Nigeria",
        resumeUrl: null,
        createdAt: "2026-07-01T00:00:00.000Z",
        updatedAt: "2026-07-20T00:00:00.000Z",
        user: {
          id: "candidate-amara",
          name: "Amara Okafor",
          email: "amara.okafor@example.com",
        },
        applicationResumes: [
          {
            applicationId: "application-1",
            jobId: "job-1",
            jobTitle: "Senior Platform Engineer",
            resumeOriginalFilename: "amara-platform.pdf",
            resumeUploadedAt: "2026-07-27T10:00:00.000Z",
            parsedYearsExperience: 7,
            parsedSkills: ["TypeScript", "Docker"],
            resumeDownloadUrl: "/api/applications/application-1/resume",
          },
        ],
        applicationInsights: [
          {
            applicationId: "application-1",
            jobId: "job-1",
            jobTitle: "Senior Platform Engineer",
            resumeOriginalFilename: "amara-platform.pdf",
            resumeUploadedAt: "2026-07-27T10:00:00.000Z",
            parsedYearsExperience: 7,
            parsedSkills: ["TypeScript", "Docker"],
            resumeDownloadUrl: "/api/applications/application-1/resume",
            fitScore: 91,
            aiSummary:
              "Amara's platform background strongly aligns with the role's reliability requirements.",
            aiStrengths: [
              "Strong TypeScript delivery",
              "Production Docker experience",
            ],
            aiGaps: ["Limited evidence of Kubernetes ownership"],
            aiScoredAt: "2026-07-27T10:02:00.000Z",
            aiScoringStatus: "completed",
          },
        ],
      },
      error: null,
      isLoading: false,
      refetch: vi.fn(),
    });

    render(
      <MemoryRouter
        initialEntries={[
          "/recruiter/candidates/candidate-profile-amara",
        ]}
      >
        <Routes>
          <Route
            path="/recruiter/candidates/:id"
            element={<RecruiterCandidateDetailsPage />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(useRecruiterCandidate).toHaveBeenCalledWith(
      "candidate-profile-amara",
    );
    expect(
      screen.getAllByText("Senior Platform Engineer"),
    ).toHaveLength(2);
    expect(screen.getByText(/amara-platform.pdf/)).toBeInTheDocument();
    expect(
      screen.getByText("Parsed skills: TypeScript, Docker"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "View or download CV" }),
    ).toHaveAttribute(
      "href",
      "/api/applications/application-1/resume",
    );
    expect(screen.getByText("91% fit")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Amara's platform background strongly aligns with the role's reliability requirements.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Strong TypeScript delivery")).toBeInTheDocument();
    expect(
      screen.getByText("Limited evidence of Kubernetes ownership"),
    ).toBeInTheDocument();
  });
});
