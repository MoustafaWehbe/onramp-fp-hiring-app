import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ResumeCard } from "@/features/candidate/components/ResumeCard";

const { useUploadResume } = vi.hoisted(() => ({
  useUploadResume: vi.fn(),
}));

vi.mock("@/features/candidate/hooks", () => ({
  useUploadResume,
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
  useUploadResume.mockReturnValue({
    isPending: false,
    mutateAsync: vi.fn(),
  });
});

describe("ResumeCard", () => {
  it("shows and downloads the persisted original filename", () => {
    render(
      <ResumeCard
        profileExists
        resumeUrl="/uploads/resumes/user/generated-id.pdf"
        resumeOriginalFilename="Jane_Doe_Resume.pdf"
      />,
    );

    expect(
      screen.getByRole("link", { name: "Jane_Doe_Resume.pdf" }),
    ).toHaveAttribute("href", "/api/candidate/resume");
    expect(
      screen.getByRole("link", { name: "Jane_Doe_Resume.pdf" }),
    ).toHaveAttribute("download", "Jane_Doe_Resume.pdf");
    expect(screen.queryByText("generated-id.pdf")).not.toBeInTheDocument();
  });

  it("uses a safe fallback for an older profile row", () => {
    render(
      <ResumeCard
        profileExists
        resumeUrl="/uploads/resumes/user/generated-id.pdf"
        resumeOriginalFilename={null}
      />,
    );

    expect(screen.getByRole("link", { name: "resume.pdf" })).toHaveAttribute(
      "download",
      "resume.pdf",
    );
    expect(screen.queryByText("generated-id.pdf")).not.toBeInTheDocument();
  });
});
