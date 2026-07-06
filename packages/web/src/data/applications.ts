import type { Application } from "../types/applications";

export const mockApplications: Application[] = [
  {
    id: "application-frontend",
    jobId: "senior-frontend-engineer",
    company: "Hireflow",
    title: "Senior Frontend Engineer",
    stage: "Technical screen",
    status: "Interviewing",
    updatedAt: "Updated today",
  },
  {
    id: "application-designer",
    jobId: "product-designer",
    company: "Lumen Labs",
    title: "Product Designer",
    stage: "Portfolio review",
    status: "Reviewing",
    updatedAt: "Updated yesterday",
  },
  {
    id: "application-advocate",
    jobId: "api-developer-advocate",
    company: "Verge",
    title: "API Developer Advocate",
    stage: "Intro call complete",
    status: "Applied",
    updatedAt: "Updated 3 days ago",
  },
];
