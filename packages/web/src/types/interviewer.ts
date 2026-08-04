import type { RecruiterApplicationStage } from "./applications";

export interface InterviewerAssignment {
  id: string;
  createdAt: string;
  application: {
    id: string;
    stage: RecruiterApplicationStage;
    submittedAt: string | null;
    coverLetter: string | null;
    resumeUrl: string | null;
    job: {
      id: string;
      title: string;
      location: string | null;
      status: "DRAFT" | "OPEN" | "CLOSED";
    };
    candidateProfile: {
      id: string;
      headline: string | null;
      location: string | null;
      resumeUrl: string | null;
      user: {
        id: string;
        name: string;
        email: string;
      };
    };
  };
}
